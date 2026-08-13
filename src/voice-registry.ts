/**
 * voice 目录发现与合并。
 *
 * 目录优先级(低 → 高,同名后者覆盖前者):
 *   内置(包内 `voices/`) < 用户 `~/.agents/voice` < 用户 `~/.dsh/voice`
 *   < 项目 `<repo>/.agents/voice` < 项目 `<repo>/.dsh/voice`
 *
 * 即:项目覆盖用户覆盖内置;同级 `.dsh` 优先于 `.agents`。这与 harness 的
 * skill 双根约定(`.dsh` / `.agents`)对齐。目录读取是同步的(voice 文件
 * 少而小),结果按 project root 缓存,由外部 watcher 负责失效。
 * @module dsh-voice/voice-registry
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseVoiceFile, VOICE_EXTENSION } from './voice-file.js'
import type { VoiceFile } from './voice-schema.js'

/** 内置 voice 目录(包内 `voices/`)。 */
const BUILTIN_VOICE_DIR = fileURLToPath(new URL('../voices', import.meta.url))

/** 环境变量覆盖 dsh home(默认 `~/.dsh`)。 */
const DSH_HOME_ENV = 'DSH_HOME'

/** 环境变量覆盖 agents home(默认 `~/.agents`)。 */
const AGENTS_HOME_ENV = 'DSH_AGENTS_HOME'

/** 解析 dsh home。 */
function dshHome(): string {
  const fromEnv = process.env[DSH_HOME_ENV]
  return resolve(fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.dsh'))
}

/** 解析 agents home。 */
function agentsHome(): string {
  const fromEnv = process.env[AGENTS_HOME_ENV]
  return resolve(fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : join(homedir(), '.agents'))
}

/** 从 cwd 向上找项目根(以 `.git` 为标记),找不到则回退 cwd 本身。 */
export function findProjectRoot(cwd: string): string {
  let current = resolve(cwd)
  while (true) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/** 用户级 voice 目录,按覆盖优先级从低到高。 */
function userVoiceDirs(): string[] {
  return [join(agentsHome(), 'voice'), join(dshHome(), 'voice')]
}

/** 项目级 voice 目录,按覆盖优先级从低到高。 */
function projectVoiceDirs(projectRoot: string): string[] {
  return [join(projectRoot, '.agents', 'voice'), join(projectRoot, '.dsh', 'voice')]
}

/**
 * 一个可写根(canonical write target),供 create-voice 元技能落盘:
 * dsh 规范目录优先,`.agents` 作为非 dsh 环境的回退。
 */
export interface VoiceWriteRoot {
  /** 用户级写根。 */
  readonly user: string
  /** 项目级写根(基于给定 cwd 的项目根)。 */
  readonly project: string
}

/** 解析写根:dsh 目录优先,`.agents` 回退。 */
export function voiceWriteRoots(cwd: string): VoiceWriteRoot {
  return {
    user: join(dshHome(), 'voice'),
    project: join(findProjectRoot(cwd), '.dsh', 'voice'),
  }
}

/** 目录扫描结果:路径 → 文件名 → 解析出的 voice。 */
function loadDir(dir: string): Map<string, VoiceFile> {
  const result = new Map<string, VoiceFile>()
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(VOICE_EXTENSION)) continue
    const path = join(dir, entry.name)
    try {
      const voice = parseVoiceFile(readFileSync(path, 'utf8'), path)
      result.set(voice.id, voice)
    } catch (error) {
      // 单个坏文件不阻断整体:跳过并在调用方可见的日志里告警。
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.warn(`dsh-voice: skipping ${path}: ${error.message}`)
      }
    }
  }
  return result
}

/** 按 project root 的发现结果缓存。 */
const cache = new Map<string, VoiceFile[]>()

/**
 * 同步列出给定 cwd 可见的全部 voice(内置 + 用户 + 项目,同名按优先级合并)。
 * 结果按 project root 缓存。
 * @param cwd - 当前工作目录;缺省只列内置 + 用户级 voice。
 * @returns 归一化后的 voice 列表(按 id 排序)。
 */
export function listVoices(cwd?: string): VoiceFile[] {
  const root = cwd === undefined ? '' : findProjectRoot(cwd)
  const cached = cache.get(root)
  if (cached !== undefined) return cached

  const merged = new Map<string, VoiceFile>()
  // 覆盖优先级从低到高依次合并。
  for (const dir of [BUILTIN_VOICE_DIR, ...userVoiceDirs(), ...(root === '' ? [] : projectVoiceDirs(root))]) {
    for (const [id, voice] of loadDir(dir)) merged.set(id, voice)
  }
  const result = [...merged.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  cache.set(root, result)
  return result
}

/** 清空发现缓存(供测试或外部 watcher 失效)。 */
export function invalidateVoiceCache(): void {
  cache.clear()
}

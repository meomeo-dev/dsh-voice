/**
 * `*.voice.yaml` 文件的解析、校验与迁移(纯函数,供插件与 CLI 共用)。
 * @module dsh-voice/voice-file
 */

import { parse as parseYaml } from 'yaml'
import { basename } from 'node:path'
import { CURRENT_VOICE_VERSION, VOICE_ID_PATTERN, VOICE_SCHEMA } from './voice-schema.js'
import type { VoiceFile } from './voice-schema.js'

/** 单次校验/迁移失败。 */
export class VoiceFileError extends Error {
  /** 出错文件路径(有则填)。 */
  readonly path?: string
  /** 出错字段或原因分类。 */
  readonly reason: string

  constructor(reason: string, path?: string, options?: ErrorOptions) {
    super(path === undefined ? reason : `${path}: ${reason}`, options)
    this.name = 'VoiceFileError'
    this.reason = reason
    this.path = path
  }
}

/** voice 文件后缀。 */
export const VOICE_EXTENSION = '.voice.yaml'

/** 迁移函数:把一个旧版本的原始对象升到下一版本。 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * 版本迁移链,key 是「迁移前」的版本号。链上每个迁移把 `raw` 规范化到
 * `key + 1`;连续应用直到 {@link CURRENT_VOICE_VERSION}。
 */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // v0(早期无 version 字段的裸 voice)→ v1:补 version。label 的缺省回退由渲染层处理。
  0: raw => ({ ...raw, version: 1 }),
}

/**
 * 从原始字符串解析一个 voice 文件:解析 YAML → 迁移版本 → 校验形状。
 * @param text - 文件文本。
 * @param path - 文件路径,用于诊断与文件名一致性检查。
 * @returns 校验通过的 voice 定义。
 * @throws {VoiceFileError} 当 YAML 非法、迁移后形状非法、或 id 与文件名不符。
 */
export function parseVoiceFile(text: string, path: string): VoiceFile {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    throw new VoiceFileError('invalid YAML', path, { cause: error })
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new VoiceFileError('must be a YAML object mapping', path)
  }
  const migrated = migrateVoice(raw as Record<string, unknown>, path)
  const value = validateVoice(migrated, path)

  const fileId = basename(path).endsWith(VOICE_EXTENSION)
    ? basename(path).slice(0, -VOICE_EXTENSION.length)
    : basename(path)
  if (value.id !== fileId) {
    throw new VoiceFileError(`id "${value.id}" must match the file basename "${fileId}"`, path)
  }
  return value
}

/** 应用迁移链,把任意历史版本的原始对象升到当前版本。 */
function migrateVoice(raw: Record<string, unknown>, path: string): Record<string, unknown> {
  let current = raw
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > CURRENT_VOICE_VERSION) {
    throw new VoiceFileError(`version ${version} is newer than supported ${CURRENT_VOICE_VERSION}`, path)
  }
  let v = version
  while (v < CURRENT_VOICE_VERSION) {
    const migrate = MIGRATIONS[v]
    if (migrate === undefined) {
      throw new VoiceFileError(`no migration from version ${v}`, path)
    }
    current = migrate(current)
    v += 1
  }
  return current
}

/** 用 schemastery 校验迁移后的对象并归一化。 */
function validateVoice(raw: Record<string, unknown>, path: string): VoiceFile {
  try {
    return VOICE_SCHEMA(raw) as VoiceFile
  } catch (error) {
    throw new VoiceFileError('invalid voice shape', path, { cause: error })
  }
}

/**
 * 校验一个待新建的 voice 对象(不经过版本迁移)。`version` 缺省取当前版本。
 * @param candidate - 待写入的 voice 对象。
 * @returns 归一化后的 voice 定义。
 * @throws {VoiceFileError} 当形状非法。
 */
export function validateNewVoice(candidate: Record<string, unknown>): VoiceFile {
  const withVersion = { version: CURRENT_VOICE_VERSION, ...candidate }
  try {
    const value = VOICE_SCHEMA(withVersion) as VoiceFile
    if (!VOICE_ID_PATTERN.test(value.id)) {
      throw new VoiceFileError(`id "${value.id}" must match ${String(VOICE_ID_PATTERN)}`)
    }
    return value
  } catch (error) {
    if (error instanceof VoiceFileError) throw error
    throw new VoiceFileError('invalid voice shape', undefined, { cause: error })
  }
}

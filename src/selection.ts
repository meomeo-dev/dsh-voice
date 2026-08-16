/**
 * 三级 voice 选择的持久化与分层解析（纯函数 + 少量 fs）。
 *
 * 三级配置统一落在 `~/.dsh/voice/selection.yaml`（独立于 `*.voice.yaml` 的
 * voice 定义发现）。解析顺序（most-specific wins）：
 *   会话 sessions[sessionId] → 工作区 workspaces[项目根] → 用户 user
 *   → legacy 用户级默认（settings.voice.tone）→ 最终回退。
 *
 * 容错原则：文件缺失/非法 YAML/条目类型不对，都静默降级，绝不抛出——
 * 用户可能移动或手改这个文件，任何异常都不影响 dsh-voice 的使用。
 * @module dsh-voice/selection
 */

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { dshHome, findProjectRoot } from './voice-registry.ts'

/** selection 状态文件名。不以 `.voice.yaml` 结尾，避开 voice 定义扫描。 */
export const SELECTION_FILENAME = 'selection.yaml'

/** 保留值：表示「关闭 voice」（该层显式不启用口吻，且阻断回退）。 */
export const VOICE_OFF = 'off'

/** 三级选择状态（缺失 = 未设置，解析时逐级回退）。 */
export interface VoiceSelection {
  /** 用户级默认 voice id；未设置 = undefined。 */
  user?: string
  /** 工作区级默认，键 = 绝对项目根（git 根）。 */
  workspaces: Record<string, string>
  /** 会话级，键 = SessionId。 */
  sessions: Record<string, string>
}

/** 空 selection（读失败或文件缺失时的降级值）。 */
export function emptySelection(): VoiceSelection {
  return { workspaces: {}, sessions: {} }
}

/** selection.yaml 的绝对路径。 */
export function selectionPath(): string {
  return join(dshHome(), 'voice', SELECTION_FILENAME)
}

/** 安全地把未知值归约为字符串映射；类型不对的条目整条跳过。 */
function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry !== '') out[key] = entry
  }
  return out
}

/**
 * 从原始文本解析 selection；任何异常返回空 selection（容错）。
 * @param text - YAML 文本。
 * @param path - 文件路径，仅用于告警。
 * @returns 归一化后的 selection。
 */
export function parseSelection(text: string, path: string): VoiceSelection {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`dsh-voice: ignoring ${path}: ${error instanceof Error ? error.message : String(error)}`)
    return emptySelection()
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return emptySelection()
  const doc = raw as Record<string, unknown>
  const selection = emptySelection()
  if (typeof doc.user === 'string' && doc.user !== '') selection.user = doc.user
  selection.workspaces = stringMap(doc.workspaces)
  selection.sessions = stringMap(doc.sessions)
  return selection
}

/** 读 selection 的 mtime 缓存（手改文件后按 mtime 失效）。 */
let cached: { mtimeMs: number; selection: VoiceSelection } | undefined

/** 使缓存失效（写入后调用）。 */
export function invalidateSelectionCache(): void {
  cached = undefined
}

/**
 * 读 selection.yaml；文件缺失或非法返回空 selection。带 mtime 缓存，
 * 手改文件后下次读取自动重读。
 * @returns 当前 selection。
 */
export function readSelection(): VoiceSelection {
  const path = selectionPath()
  let mtimeMs = 0
  try {
    mtimeMs = statSync(path).mtimeMs
  } catch {
    // 文件缺失：mtime 0，parse 阶段再返回空 selection。
  }
  if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.selection
  const selection = existsSync(path)
    ? parseSelection(readFileSync(path, 'utf8'), path)
    : emptySelection()
  cached = { mtimeMs, selection }
  return selection
}

/**
 * 写 selection.yaml（原子：临时文件 + rename）。目录不存在则创建。
 * @param selection - 待持久化的 selection。
 */
export function writeSelection(selection: VoiceSelection): void {
  const path = selectionPath()
  mkdirSync(dirname(path), { recursive: true })
  const doc: Record<string, unknown> = { version: 1 }
  if (selection.user !== undefined) doc.user = selection.user
  if (Object.keys(selection.workspaces).length > 0) doc.workspaces = selection.workspaces
  if (Object.keys(selection.sessions).length > 0) doc.sessions = selection.sessions
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${stringifyYaml(doc)}\n`)
  renameSync(tmp, path)
  invalidateSelectionCache()
}

/** 判断一个 id 是否「已知」；`knownIds` 缺省时不做过滤。 */
function isKnown(id: string, knownIds: ReadonlySet<string> | undefined): boolean {
  return knownIds === undefined || knownIds.has(id)
}

/**
 * 分层解析生效 voice（纯函数）。
 * 顺序：会话 → 工作区 → 用户（selection）→ legacy 用户默认 → 最终回退。
 * 任一层的值若为 {@link VOICE_OFF}，立即终止并返回 `off`（显式关闭，阻断回退）；
 * 否则该值不在 `knownIds` 内时视为未设置，继续回退。
 * @param selection - 当前 selection 状态。
 * @param sessionId - 当前会话 id（可能缺省）。
 * @param cwd - 当前工作目录（用于推导工作区键）。
 * @param legacyUser - settings.voice.tone 的 legacy 用户默认。
 * @param fallback - 最终回退 id。
 * @param knownIds - 已知 voice id 集合；缺省不做过滤。
 * @returns 生效 voice id，或 `off`。
 */
export function resolveEffectiveVoice(
  selection: VoiceSelection,
  sessionId: string | undefined,
  cwd: string | undefined,
  legacyUser: string,
  fallback: string,
  knownIds?: ReadonlySet<string>,
): string {
  if (sessionId !== undefined) {
    const sessionVoice = selection.sessions[sessionId]
    if (sessionVoice === VOICE_OFF) return VOICE_OFF
    if (sessionVoice !== undefined && isKnown(sessionVoice, knownIds)) return sessionVoice
  }
  const root = cwd === undefined ? undefined : findProjectRoot(cwd)
  if (root !== undefined) {
    const workspaceVoice = selection.workspaces[root]
    if (workspaceVoice === VOICE_OFF) return VOICE_OFF
    if (workspaceVoice !== undefined && isKnown(workspaceVoice, knownIds)) return workspaceVoice
  }
  if (selection.user === VOICE_OFF) return VOICE_OFF
  if (selection.user !== undefined && isKnown(selection.user, knownIds)) return selection.user
  if (legacyUser === VOICE_OFF) return VOICE_OFF
  if (isKnown(legacyUser, knownIds)) return legacyUser
  return fallback
}

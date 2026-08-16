/**
 * voice 切换提醒的持久化与判定。
 *
 * 用户在一段会话内切换 voice 后,需要在下个 turn 注入一次「身份已切换」的
 * 提醒(见 docs/stories/voice-switch-reminder.md)。这里用「待提醒标记」建模:
 *
 *   - 触发点是「写 selection 的切换动作」(`/voice/set` 路由、`/voice` 命令),
 *     在写入前/后各算一次「当前会话生效 voice」(3 级按优先级折叠,见
 *     {@link detectEffectiveSwitch}),折叠值变化才落一个 pending 标记。
 *   - 消费点是 system prompt section 的下一次 assemble,取走并清除该会话的
 *     pending 标记——所以提醒恰好消费一次,且发生在下个 turn。
 *
 * 标记按 session 隔离,持久化在 `~/.dsh/voice/switch-state.yaml`。容错原则与
 * selection.yaml 一致:文件缺失 / 非法 YAML / 条目类型不对,静默降级,绝不抛出。
 * @module dsh-voice/switch-state
 */

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { resolveEffectiveVoice, VOICE_OFF, type VoiceSelection } from './selection.ts'
import { dshHome } from './voice-registry.ts'

/** switch 状态文件名。 */
export const SWITCH_STATE_FILENAME = 'switch-state.yaml'

/** 会话级待提醒状态:sessionId → 下个 turn 需提醒的新 voice id。 */
export interface SwitchState {
  /** 待提醒映射;有记录 = 该会话下个 turn 注入一次提醒。 */
  pending: Record<string, string>
}

/** 空 switch 状态(读失败或文件缺失时的降级值)。 */
export function emptySwitchState(): SwitchState {
  return { pending: {} }
}

/** switch-state.yaml 的绝对路径。 */
export function switchStatePath(): string {
  return join(dshHome(), 'voice', SWITCH_STATE_FILENAME)
}

/** 安全地把未知值归约为字符串映射;类型不对的条目整条跳过。 */
function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry !== '') out[key] = entry
  }
  return out
}

/**
 * 从原始文本解析 switch 状态;任何异常返回空状态(容错)。
 * @param text - YAML 文本。
 * @param path - 文件路径,仅用于告警。
 * @returns 归一化后的 switch 状态。
 */
export function parseSwitchState(text: string, path: string): SwitchState {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`dsh-voice: ignoring ${path}: ${error instanceof Error ? error.message : String(error)}`)
    return emptySwitchState()
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return emptySwitchState()
  return { pending: stringMap((raw as Record<string, unknown>).pending) }
}

/** 读 switch 状态的 mtime 缓存(手改文件后按 mtime 失效)。 */
let cached: { mtimeMs: number; state: SwitchState } | undefined

/** 使缓存失效(写入后调用)。 */
export function invalidateSwitchStateCache(): void {
  cached = undefined
}

/**
 * 读 switch-state.yaml;文件缺失或非法返回空状态。带 mtime 缓存。
 * @returns 当前 switch 状态。
 */
export function readSwitchState(): SwitchState {
  const path = switchStatePath()
  let mtimeMs = 0
  try {
    mtimeMs = statSync(path).mtimeMs
  } catch {
    // 文件缺失:mtime 0,parse 阶段再返回空状态。
  }
  if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.state
  const state = existsSync(path)
    ? parseSwitchState(readFileSync(path, 'utf8'), path)
    : emptySwitchState()
  cached = { mtimeMs, state }
  return state
}

/**
 * 写 switch-state.yaml(原子:临时文件 + rename)。目录不存在则创建。
 * @param state - 待持久化的状态。
 */
export function writeSwitchState(state: SwitchState): void {
  const path = switchStatePath()
  mkdirSync(dirname(path), { recursive: true })
  const doc: Record<string, unknown> = { version: 1 }
  if (Object.keys(state.pending).length > 0) doc.pending = state.pending
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${stringifyYaml(doc)}\n`)
  renameSync(tmp, path)
  invalidateSwitchStateCache()
}

/** 标记某会话「下个 turn 需提醒一次」;同会话重复标记覆盖为最新值。 */
export function markPending(state: SwitchState, sessionId: string, voiceId: string): SwitchState {
  return { pending: { ...state.pending, [sessionId]: voiceId } }
}

/** 取走并清除某会话的待提醒标记(消费一次)。 */
export function consumePending(state: SwitchState, sessionId: string): { voiceId: string | undefined; next: SwitchState } {
  const voiceId = state.pending[sessionId]
  if (voiceId === undefined) return { voiceId: undefined, next: state }
  const next = { ...state.pending }
  delete next[sessionId]
  return { voiceId, next: { pending: next } }
}

/**
 * 判定一次 selection 写入是否改变了「当前会话生效 voice」,并返回值得提醒的新 id。
 * 纯函数,供切换点(路由/命令)在写 selection 前后各调用一次。
 * 折叠值不变 → undefined(改动被更高优先级层遮蔽,不算切换);
 * 新值为 off 或未知 id → undefined(off 无身份、未知 id 无指导文本可提醒)。
 * @param before - 切换前的 selection。
 * @param after - 切换后的 selection。
 * @param sessionId - 当前会话 id。
 * @param cwd - 当前工作目录。
 * @param legacyUser - settings.voice.tone 的 legacy 用户默认。
 * @param fallback - 最终回退 id。
 * @param knownIds - 已知 voice id 集合。
 * @returns 需要提醒的新 voice id,或 undefined。
 */
export function detectEffectiveSwitch(
  before: VoiceSelection,
  after: VoiceSelection,
  sessionId: string,
  cwd: string | undefined,
  legacyUser: string,
  fallback: string,
  knownIds: ReadonlySet<string>,
): string | undefined {
  const previous = resolveEffectiveVoice(before, sessionId, cwd, legacyUser, fallback, knownIds)
  const next = resolveEffectiveVoice(after, sessionId, cwd, legacyUser, fallback, knownIds)
  if (previous === next) return undefined
  if (next === VOICE_OFF || !knownIds.has(next)) return undefined
  return next
}

/**
 * 切换点专用:检测生效 voice 是否变化,变化则落一个 pending 标记。
 * 写状态失败静默(提醒是增强,不阻塞 voice 切换本身)。
 * @param before - 切换前的 selection。
 * @param after - 切换后的 selection。
 * @param sessionId - 当前会话 id。
 * @param cwd - 当前工作目录。
 * @param legacyUser - settings.voice.tone 的 legacy 用户默认。
 * @param fallback - 最终回退 id。
 * @param knownIds - 已知 voice id 集合。
 */
export function noteEffectiveSwitch(
  before: VoiceSelection,
  after: VoiceSelection,
  sessionId: string,
  cwd: string | undefined,
  legacyUser: string,
  fallback: string,
  knownIds: ReadonlySet<string>,
): void {
  const switchedTo = detectEffectiveSwitch(before, after, sessionId, cwd, legacyUser, fallback, knownIds)
  if (switchedTo === undefined) return
  try {
    writeSwitchState(markPending(readSwitchState(), sessionId, switchedTo))
  } catch {
    // 静默:提醒缺失不影响 voice 切换。
  }
}

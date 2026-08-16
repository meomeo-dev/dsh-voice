/**
 * 判定一次 selection 写入是否改变了「当前会话生效 voice」。
 *
 * 三级 voice 按优先级折叠(会话 → 工作区 → 用户 → legacy 默认),只有折叠值
 * 变化才算「切换」;改动被更高优先级层遮蔽的层级不算切换。详见
 * docs/stories/voice-switch-reminder.md。
 * @module dsh-voice/switch-detect
 */

import { resolveEffectiveVoice, VOICE_OFF, type VoiceSelection } from './selection.ts'

/**
 * 判定切换前后「当前会话生效 voice」是否变化,并返回值得提醒的新 id。
 * 折叠值不变 → undefined;新值为 off 或未知 id → undefined(off 无身份、
 * 未知 id 无指导文本可提醒)。
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
  sessionId: string | undefined,
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

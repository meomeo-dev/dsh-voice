/**
 * 口吻 section 的渲染逻辑(纯函数)。
 * @module dsh-voice/section
 */

import type { VoiceFile } from './voice-schema.ts'
import { DEFAULT_TONE_ID } from './tones.ts'

/**
 * 由当前生效口吻 id 得到该口吻的 prompt 文本。
 * 未知 id 回退到默认口吻;找不到默认口吻时返回空串(该 section 会在渲染时被丢弃)。
 * @param voices - 当前可见的全部 voice。
 * @param activeId - 当前生效口吻 id。
 * @returns 面向模型的指导文本,或空串。
 */
export function voicePromptFor(voices: readonly VoiceFile[], activeId: string): string {
  const voice = voices.find(v => v.id === activeId) ?? voices.find(v => v.id === DEFAULT_TONE_ID)
  return voice?.prompt ?? ''
}

/**
 * 切换 voice 后注入的一次性提醒文案（纯函数）。
 * @module dsh-voice/switch-reminder
 */

import type { VoiceFile } from './voice-schema.ts'

/**
 * 由新 voice 的展示名与角色定位渲染切换提醒。
 * @param voice - 切换后的生效 voice。
 * @returns 面向模型的提醒文本。
 */
export function switchReminderFor(voice: VoiceFile): string {
  const label = voice.label !== '' ? voice.label : voice.id
  const role = voice.identity.role
  return `<reminder>用户切赋予你(${label})了新的身份${role}, 你回顾已更新的 <you_remembered_your_voice_the_way_you_were_taught_to_speak/>, 然后以新的身份开始.</reminder>`
}

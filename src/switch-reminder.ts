/**
 * 切换 voice 后的一次性转向提醒:文案渲染 + 注入为下一 turn 的用户消息。
 *
 * 提醒作为 user 消息经 `agent.inject()` 进入 next-step 队列,**不唤醒 driver**;
 * 用户下一条消息开启下一 turn 时,该提醒被 claim 为该 turn 的第一条 user 消息,
 * 从而实现「随着下一轮 turn 发出去、只消费一次」。同一会话仍有 pending 提醒时
 * 以新值替换旧值，避免连续切换把中间 voice 一并发给模型。注入的消息经
 * `agent/inbox/spliced` 落盘,会话内跨重启仍保留(见 docs/stories/voice-switch-reminder.md)。
 * @module dsh-voice/switch-reminder
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { VoiceFile } from './voice-schema.ts'

/**
 * 由新 voice 的展示名与角色定位渲染切换提醒文案。
 * @param voice - 切换后的生效 voice。
 * @returns 面向模型的提醒文本。
 */
export function switchReminderFor(voice: VoiceFile): string {
  const label = voice.label !== '' ? voice.label : voice.id
  const role = voice.identity.role
  return `<reminder>用户切赋予你(${label})了新的身份${role}, 你回顾已更新的 <you_remembered_your_voice_the_way_you_were_taught_to_speak/>, 然后以新的身份开始. 对话中自然地使用称呼, 不要生硬的使用用户身份标识, 只是用于说明各自身份, 不是称呼要求, 不要总使用<nickname>(user)的形式.</reminder>`
}

/**
 * 把切换提醒作为 user 消息注入目标会话,随下一 turn 发出(不唤醒 driver)。
 * @param agent - 目标会话的 live agent。
 * @param voice - 切换后的生效 voice。
 */
export function injectSwitchReminder(agent: Agent, voice: VoiceFile): void {
  const message = createUserMessage({
    content: [{ type: 'text', text: switchReminderFor(voice) }],
    source: { kind: 'plugin', plugin: 'dsh-voice' },
  })
  const pending = agent.inbox.nextStep.find(candidate =>
    candidate.source.kind === 'plugin'
    && candidate.source.plugin === 'dsh-voice')
  if (pending !== undefined && agent.inbox.replace(pending.id, message)) return
  agent.inject(message)
}

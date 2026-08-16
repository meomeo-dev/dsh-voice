/**
 * browser half：把「🎙️设置会话Voice」入口注册进会话标题栏的
 * `conversation.session.header.actions` list 槽，点开下拉菜单、再点开
 * 三级 voice 设置模态框。host 侧数据经 `/voice/*` 路由往返。
 * @module dsh-voice/client
 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceSettingAction } from './VoiceSettingAction.tsx'
import type { VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import { en, NS, zh, type VoiceSettingKey } from './locales.ts'
import { getVoiceState, setVoice } from './api.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'voice-setting': VoiceSettingKey
  }
}

export const inject = ['slots', 'sessions', 'locale']

/**
 * 客户端插件体：注册 locale 字典 + 标题栏 voice 入口。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-voice: browser dictionaries')

  const actions = (_sessionId: SessionId): VoiceSettingInjected => ({
    getState: (sessionId, cwd) => getVoiceState(sessionId, cwd),
    setVoice: (sessionId, cwd, level, voiceId) => setVoice(sessionId, cwd, level, voiceId),
  })

  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'voice-setting',
      order: 20,
      locale: NS,
      inject: actions,
    }, VoiceSettingAction),
  )
}

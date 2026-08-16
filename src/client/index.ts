/**
 * browser half：把 🎙️ 入口注册进会话标题栏，点开下拉渲染 `voice.menu` 子槽。
 * `voice.menu` 是 dsh-voice 声明的宿主槽（list、session scope）：本插件自己
 * 往里放「设置会话Voice」，其他社区插件（如 dsh-voice-tts）也可注入自己的
 * 菜单项，从而共用同一个 🎙️ 图标。host 侧数据经 `/voice/*` 路由往返。
 * @module dsh-voice/client
 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceSettingAction } from './VoiceSettingAction.tsx'
import { VoiceMenuItem } from './VoiceMenuItem.tsx'
import type { VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import { en, NS, zh, type VoiceSettingKey } from './locales.ts'
import { getVoiceState, setVoice } from './api.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'voice-setting': VoiceSettingKey
  }
  interface SlotMap {
    /**
     * 🎙️ 下拉里的菜单项列表（session scope）。由 dsh-voice 声明并渲染；
     * 每个社区插件各注册自己的条目，共用同一个图标入口。
     */
    'voice.menu': { kind: 'list'; scope: 'session' }
  }
}

export const inject = ['slots', 'sessions', 'locale']

/**
 * 客户端插件体：注册 locale 字典 + 🎙️ 标题栏入口 + 自己的 voice.menu 菜单项。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-voice: browser dictionaries')

  const actions = (_sessionId: SessionId): VoiceSettingInjected => ({
    getState: (sessionId, cwd) => getVoiceState(sessionId, cwd),
    setVoice: (sessionId, cwd, level, voiceId) => setVoice(sessionId, cwd, level, voiceId),
  })

  // 🎙️ 标题栏入口：下拉里渲染 voice.menu（children 声明 = 渲染授权）。
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'voice-setting',
      order: 20,
      locale: NS,
      children: {
        'voice.menu': { kind: 'list', scope: 'session' },
      },
    }, VoiceSettingAction),
  )

  // dsh-voice 自己的菜单项：设置会话Voice。
  ctx.slots.inject(
    'voice.menu',
    () => ctx.slots.register({
      name: 'voice.menu',
      id: 'voice-setting-menu',
      locale: NS,
      inject: actions,
    }, VoiceMenuItem),
  )
}

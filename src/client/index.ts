/**
 * browser half：把 🎙️ 入口注册进会话标题栏，点开下拉渲染 `voice.menu` 子槽。
 * `voice.menu` 是 dsh-voice 声明的宿主槽（list、session scope）：本插件自己
 * 往里放「设置会话Voice」，其他社区插件（如 dsh-voice-tts）也可注入自己的
 * 菜单项，从而共用同一个 🎙️ 图标。host 侧数据经 `/voice/*` 路由往返。
 * @module dsh-voice/client
 */

import type { ClientContext, ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceSettingAction } from './VoiceSettingAction.tsx'
import { VoiceMenuItem } from './VoiceMenuItem.tsx'
import { VoiceHeroAction } from './VoiceHeroAction.tsx'
import { VoiceHeroMenuItem, type VoiceHeroInjected } from './VoiceHeroMenuItem.tsx'
import type { VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import { HeroVoiceSeatController } from './hero-seat.ts'
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
    /**
     * 新建会话 hero 屏 🎙️ 下拉里的菜单项列表（root scope）。与 `voice.menu` 同构，
     * 但无 session；dsh-voice 与 dsh-voice-tts 各自注入条目，共用 hero 图标入口。
     */
    'voice.hero.menu': { kind: 'list'; scope: 'root' }
  }
}

export const inject = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * 客户端插件体：注册 locale 字典 + 🎙️ 标题栏入口 + hero 屏 🎙️ 入口 + 各自的
 * voice.menu / voice.hero.menu 菜单项。hero 屏选择暂存（HeroVoiceSeatController），
 * 在空白会话成为 current 时写为 session 级 voice。
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

  // hero 屏 voice 席位：把「下一个新 session 的 voice」暂存，空白会话成为 current 时写 session 级。
  // 客户端 `sessions` 服务经 ctx.get 取（`ctx.sessions` 与 host 侧 dsh-session 的 SessionStore
  // 声明同名、拓扑敏感，见 routes.ts 的既有约定），避免 host/client 声明合并冲突。
  const sessions = ctx.get('sessions') as unknown as ISessions
  const seat = new HeroVoiceSeatController(
    (sessionId, cwd, level, voiceId) => setVoice(sessionId, cwd, level, voiceId),
    () => {
      const state = sessions.list.getSnapshot()
      const current = state.current
      if (current === undefined) return undefined
      const summary = state.byId[current]
      return summary === undefined ? undefined : { id: current, cwd: summary.cwd, blank: summary.blank }
    },
  )

  ctx.effect(() => {
    const stop = sessions.list.subscribe(() => { void seat.apply() })
    return () => { stop() }
  }, 'dsh-voice: hero voice seat apply')

  const heroActions = (): VoiceHeroInjected => ({
    getState: (sessionId, cwd) => getVoiceState(sessionId, cwd),
    setVoice: (sessionId, cwd, level, voiceId) => setVoice(sessionId, cwd, level, voiceId),
    stageSession: voiceId => { void seat.select(voiceId) },
    stagedSession: () => seat.snapshot(),
    workspaceCwd: () => {
      const state = ctx.workspaces.list.getSnapshot()
      const id = state.recentWorkspaceId
      return id === undefined ? undefined : state.items.find(workspace => workspace.workspaceId === id)?.path
    },
  })

  // hero 屏 🎙️ 入口：下拉渲染 voice.hero.menu（list slot，按 id 与 tts 回落并存）。
  ctx.slots.inject(
    'conversation.hero.voice',
    () => ctx.slots.register({
      name: 'conversation.hero.voice',
      id: 'voice-setting-hero',
      locale: NS,
      children: {
        'voice.hero.menu': { kind: 'list', scope: 'root' },
      },
    }, VoiceHeroAction),
  )

  // hero 屏 dsh-voice 自己的菜单项：设置「下一个新 session」的 voice。
  ctx.slots.inject(
    'voice.hero.menu',
    () => ctx.slots.register({
      name: 'voice.hero.menu',
      id: 'voice-hero-menu',
      locale: NS,
      inject: heroActions,
    }, VoiceHeroMenuItem),
  )
}

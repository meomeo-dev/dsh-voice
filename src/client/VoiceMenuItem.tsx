/** 🎙️ 下拉里 dsh-voice 自己的菜单项：「设置会话Voice」，点击打开模态框。 */

import { useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import { VoiceSettingDialog, type VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import css from './VoiceMenuItem.module.css'

/** voice.menu 菜单项组件的完整 props。 */
export type VoiceMenuItemProps =
  PropsRuntime<'voice.menu'> & VoiceSettingInjected & PropsLocale<typeof NS>

/**
 * 「设置会话Voice」菜单项：一个按钮，点击打开 {@link VoiceSettingDialog}。
 * @param props - 会话标准 props + 业务动作 + locale。
 * @returns 菜单项按钮 + 模态框。
 */
export function VoiceMenuItem({ sessionId, useSessions, getState, setVoice, t }: VoiceMenuItemProps) {
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" role="menuitem" className={css.item} onClick={() => { setOpen(true) }}>
        {t('menu.item')}
      </button>
      <VoiceSettingDialog
        open={open}
        onClose={() => { setOpen(false) }}
        sessionId={sessionId as SessionId}
        cwd={cwd}
        getState={getState}
        setVoice={setVoice}
        t={t}
      />
    </>
  )
}

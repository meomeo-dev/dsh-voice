/** 会话标题栏的 🎙️ 入口按钮：点开下拉菜单，点「设置会话Voice」打开模态框。 */

import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import { VoiceSettingDialog, type VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import css from './VoiceSettingAction.module.css'

/** header action 组件的完整 props。 */
export type VoiceSettingActionProps =
  PropsRuntime<'conversation.session.header.actions'> & VoiceSettingInjected & PropsLocale<typeof NS>

/**
 * 会话标题栏的 voice 入口：一个 🎙️ 按钮 + 下拉菜单（含「🎙️设置会话Voice」）。
 * 点菜单项打开 {@link VoiceSettingDialog}。
 * @param props - 会话标准 props + 业务动作 + locale。
 * @returns 触发按钮与（打开时的）下拉菜单 + 模态框。
 */
export function VoiceSettingAction({
  sessionId, useSessions, getState, setVoice, t,
}: VoiceSettingActionProps) {
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => { document.removeEventListener('pointerdown', closeOutside) }
  }, [menuOpen])

  const openDialog = (): void => {
    setMenuOpen(false)
    setDialogOpen(true)
  }

  return (
    <div className={css.root} ref={rootRef}>
      <button
        type="button"
        className={css.trigger}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('trigger.aria')}
        onClick={() => { setMenuOpen(next => !next) }}
      >
        🎙️
      </button>
      {menuOpen && (
        <div className={css.menu} role="menu">
          <button type="button" role="menuitem" className={css.menuItem} onClick={openDialog}>
            {t('menu.item')}
          </button>
        </div>
      )}
      <VoiceSettingDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false) }}
        sessionId={sessionId as SessionId}
        cwd={cwd}
        getState={getState}
        setVoice={setVoice}
        t={t}
      />
    </div>
  )
}

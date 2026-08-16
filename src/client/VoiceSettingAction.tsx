/** 会话标题栏的 🎙️ 入口按钮：点开下拉菜单，渲染 `voice.menu` 子槽。 */

import { useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import css from './VoiceSettingAction.module.css'

/** header action 组件的完整 props。 */
export type VoiceSettingActionProps =
  PropsRuntime<'conversation.session.header.actions'> & PropsRenderSlots<'voice.menu'> & PropsLocale<typeof NS>

/**
 * 会话标题栏的 voice 入口：一个 🎙️ 按钮 + 下拉菜单（渲染 voice.menu 的条目）。
 * @param props - 会话标准 props + renderSlot + locale。
 * @returns 触发按钮与（打开时的）下拉菜单。
 */
export function VoiceSettingAction({ renderSlot, t }: VoiceSettingActionProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      // 子菜单项弹出的模态框 portal 到 body（Modal），不在 anchor 子树内；
      // 把它的关闭判定交给 Modal 自身（遮罩 click / Esc），这里不再顺带关掉
      // 下拉，否则点击面板内部会把菜单连同模态框一起卸载。
      if (target instanceof Element && target.closest('[role="dialog"]') !== null) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => { document.removeEventListener('pointerdown', closeOutside) }
  }, [menuOpen])

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
          {renderSlot('voice.menu', {})}
        </div>
      )}
    </div>
  )
}

/** 新建会话 hero 屏的 🎙️ 入口按钮：点开下拉菜单，渲染 `voice.hero.menu` 子槽（root scope）。 */

import { useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import css from './VoiceSettingAction.module.css'

/** hero voice 入口的完整 props。 */
export type VoiceHeroActionProps =
  PropsRuntime<'conversation.hero.voice'> & PropsRenderSlots<'voice.hero.menu'> & PropsLocale<typeof NS>

/**
 * hero 屏的 voice 入口：一个 🎙️ 按钮 + 下拉菜单（渲染 voice.hero.menu 的条目）。
 * 与 header 的 {@link VoiceSettingAction} 同构，但挂在 root 作用域的 hero 槽上、无 sessionId。
 * @param props - 会话标准 props + renderSlot + locale。
 * @returns 触发按钮与（打开时的）下拉菜单。
 */
export function VoiceHeroAction({ renderSlot, t }: VoiceHeroActionProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOutside = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      // 子菜单项弹出的模态框 portal 到 body，不在 anchor 子树内；交由 Modal 自身关闭。
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
          {renderSlot('voice.hero.menu', {})}
        </div>
      )}
    </div>
  )
}

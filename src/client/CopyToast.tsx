/** 复制成功的右上角 toast：短暂显示后淡出并回调。复用 dsh Toast 的视觉语言。 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import css from './CopyToast.module.css'

/** 完整可见时长（与 CopyToast.module.css 的淡出延迟 + 时长一致）。 */
const VISIBLE_MS = 2000

/**
 * 右上角浮动提示。pointer-events 关闭，纯通告；`onDone` 到点回调以便卸载。
 * @param props.text - 提示文案（本地化）。
 * @param props.onDone - 淡出完成回调，卸载 toast。
 * @returns 浮动提示（body portal）。
 */
export function CopyToast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, VISIBLE_MS)
    return () => { clearTimeout(timer) }
  }, [onDone])
  return createPortal(
    <div className={css.toast} role="status">{text}</div>,
    document.body,
  )
}

/** hero 屏 🎙️ 下拉里 dsh-voice 自己的菜单项：设置「下一个新 session」的 voice，打开三级对话框。 */

import { useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { NS } from './locales.ts'
import { VoiceSettingDialog, type VoiceSettingInjected } from './VoiceSettingDialog.tsx'
import css from './VoiceMenuItem.module.css'

/** hero voice 菜单项的注入面：三级读写 + 会话级暂存 + 工作区 cwd。 */
export interface VoiceHeroInjected extends VoiceSettingInjected {
  /** 把「新建会话」级选择暂存（null = 继承 = 清除暂存）。 */
  stageSession: (voiceId: string | null) => void
  /** 当前工作区的 cwd（无选中工作区时为 undefined）。 */
  workspaceCwd: () => string | undefined
}

/** hero voice 菜单项组件的完整 props。 */
export type VoiceHeroMenuItemProps =
  PropsRuntime<'voice.hero.menu'> & VoiceHeroInjected & PropsLocale<typeof NS>

/**
 * 「设置会话Voice」菜单项（hero 版）：打开 {@link VoiceSettingDialog}，但 session 级走
 * 暂存（stageSession）而非立即写，workspace 级用选中工作区的 cwd。
 * @param props - 业务动作 + 暂存 + cwd + locale。
 * @returns 菜单项按钮 + 模态框。
 */
export function VoiceHeroMenuItem({
  getState, setVoice, stageSession, workspaceCwd, t,
}: VoiceHeroMenuItemProps) {
  const [open, setOpen] = useState(false)
  const cwd = workspaceCwd()

  return (
    <>
      <button type="button" role="menuitem" className={css.item} onClick={() => { setOpen(true) }}>
        {t('menu.item')}
      </button>
      <VoiceSettingDialog
        open={open}
        onClose={() => { setOpen(false) }}
        sessionId={undefined}
        cwd={cwd}
        getState={getState}
        setVoice={setVoice}
        stageSession={stageSession}
        t={t}
      />
    </>
  )
}

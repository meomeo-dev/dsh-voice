/** 三级 voice 设置模态框：会话 / 工作区 / 用户默认，各一个下拉切换 + 复制按钮。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { IconCopyOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { VoiceLevel, VoiceOption, VoiceState } from './api.ts'
import { CopyToast } from './CopyToast.tsx'
import { NS } from './locales.ts'
import css from './VoiceSettingDialog.module.css'

/** 供父组件（header action）注入的业务动作。 */
export interface VoiceSettingInjected {
  getState: (sessionId: SessionId, cwd: string | undefined) => Promise<VoiceState>
  setVoice: (
    sessionId: SessionId, cwd: string | undefined, level: VoiceLevel, voiceId: string | null,
  ) => Promise<VoiceState>
}

/** 模态框 props。 */
export interface VoiceSettingDialogProps {
  open: boolean
  onClose: () => void
  sessionId: SessionId
  cwd: string | undefined
  getState: VoiceSettingInjected['getState']
  setVoice: VoiceSettingInjected['setVoice']
  t: TranslateNS<typeof NS>
}

/** 把 effective id 映射为可读文案（`off` 与未知 id 分别处理）。 */
function effectiveLabel(effective: string, voices: VoiceOption[], t: TranslateNS<typeof NS>): string {
  if (effective === 'off') return t('off')
  return voices.find(voice => voice.id === effective)?.label ?? effective
}

/** 一个层级的下拉行。`allowInherit` 为该层提供「继承」选项（会话/工作区）。 */
function LevelRow({
  label, value, voices, allowInherit, onSelect, onCopy, t,
}: {
  label: string
  value: string | null
  voices: VoiceOption[]
  allowInherit: boolean
  onSelect: (voiceId: string | null) => void
  onCopy: (voiceId: string) => void
  t: TranslateNS<typeof NS>
}) {
  // `<select>` 用空串表示「继承」（映射为 null）。
  const selected = value ?? ''
  const copyable = value !== null && value !== 'off'
  return (
    <div className={css.row}>
      <span className={css.label}>{label}</span>
      <select
        className={css.select}
        value={selected}
        onChange={(event) => { onSelect(event.target.value === '' ? null : event.target.value) }}
      >
        {allowInherit && <option value="">{t('inherit')}</option>}
        <option value="off">{t('off')}</option>
        {voices.filter(voice => voice.id !== 'off').map(voice => (
          <option key={voice.id} value={voice.id}>{voice.label}</option>
        ))}
      </select>
      <button
        type="button"
        className={css.copy}
        aria-label={t('copy.aria')}
        title={t('copy.aria')}
        disabled={!copyable}
        onClick={() => { if (copyable) onCopy(value) }}
      >
        <IconCopyOutline16 size={14} />
      </button>
    </div>
  )
}

/**
 * 三级 voice 设置模态框。
 * @param props - open/onClose + 会话上下文 + 业务动作 + locale。
 * @returns 关闭时为 null，否则 overlay 树。
 */
export function VoiceSettingDialog({
  open, onClose, sessionId, cwd, getState, setVoice, t,
}: VoiceSettingDialogProps) {
  const [state, setState] = useState<VoiceState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null)
  const toastKey = useRef(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setState(null)
    setError(null)
    getState(sessionId, cwd)
      .then((next) => { if (!cancelled) setState(next) })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { cancelled = true }
  }, [open, sessionId, cwd, getState])

  const select = useCallback((level: VoiceLevel) => (voiceId: string | null) => {
    setVoice(sessionId, cwd, level, voiceId)
      .then(next => setState(next))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
  }, [sessionId, cwd, setVoice])

  const copyVoiceId = useCallback((id: string) => {
    void navigator.clipboard.writeText(id).then(() => {
      toastKey.current += 1
      setToast({ key: toastKey.current, text: t('copy.done') })
    }).catch(() => {})
  }, [t])

  return (
    <Modal open={open} onClose={onClose} title={t('dialog.title')} description={t('dialog.description')}>
      {error !== null
        ? <p className={css.error}>{t('load.error')}: {error}</p>
        : state === null
          ? <p className={css.empty}>{t('loading')}</p>
          : state.voices.length === 0
            ? <p className={css.empty}>{t('empty')}</p>
            : (
              <>
                <p className={css.effective}>
                  {t('level.effective')}: {effectiveLabel(state.effective, state.voices, t)}
                </p>
                <LevelRow
                  label={t('level.session')}
                  value={state.session}
                  voices={state.voices}
                  allowInherit
                  onSelect={select('session')}
                  onCopy={copyVoiceId}
                  t={t}
                />
                <LevelRow
                  label={t('level.workspace')}
                  value={state.workspace}
                  voices={state.voices}
                  allowInherit
                  onSelect={select('workspace')}
                  onCopy={copyVoiceId}
                  t={t}
                />
                <LevelRow
                  label={t('level.user')}
                  value={state.user}
                  voices={state.voices}
                  allowInherit={false}
                  onSelect={select('user')}
                  onCopy={copyVoiceId}
                  t={t}
                />
              </>
            )}
      {toast !== null && <CopyToast key={toast.key} text={toast.text} onDone={() => { setToast(null) }} />}
    </Modal>
  )
}

/** browser half 的 locale 字典（zh / en）。 */

/** 本插件的 locale 命名空间。 */
export const NS = 'voice-setting'

const en = {
  'trigger.aria': 'Set session voice',
  'menu.item': 'Set session voice',
  'dialog.title': 'Set session voice',
  'dialog.description': 'Voice is resolved as session > workspace > user default.',
  'level.session': 'This session',
  'level.nextSession': 'Next session',
  'level.workspace': 'This workspace',
  'level.user': 'User default',
  'level.effective': 'Effective now',
  'inherit': 'Inherit',
  'off': 'Off',
  'copy.aria': 'Copy voice id',
  'copy.done': 'Copied',
  'loading': 'Loading…',
  'empty': 'No voice available',
  'load.error': 'Failed to load voice settings',
} as const

export type VoiceSettingKey = keyof typeof en

const zh: Record<VoiceSettingKey, string> = {
  'trigger.aria': '设置会话 Voice',
  'menu.item': '设置会话Voice',
  'dialog.title': '设置会话 Voice',
  'dialog.description': 'Voice 按 会话 > 工作区 > 用户默认 逐级生效。',
  'level.session': '当前会话',
  'level.nextSession': '新建会话',
  'level.workspace': '当前工作区',
  'level.user': '用户默认',
  'level.effective': '当前生效',
  'inherit': '继承',
  'off': '关闭',
  'copy.aria': '复制 voice id',
  'copy.done': '复制成功',
  'loading': '加载中…',
  'empty': '无可用 voice',
  'load.error': '加载 voice 设置失败',
}

export { en, zh }

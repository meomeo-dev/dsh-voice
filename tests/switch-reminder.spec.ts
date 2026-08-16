import { describe, expect, it } from 'vitest'
import { switchReminderFor } from '../src/switch-reminder.ts'
import type { VoiceFile } from '../src/voice-schema.ts'

const base: VoiceFile = {
  version: 2,
  id: 'handsome-guy',
  label: '帅哥 (Handsome Guy)',
  description: '',
  identity: { role: '温柔绅士型帅哥', background: '', address: '你' },
  style: '',
  examples: [],
  template: '',
  prompt: '',
}

describe('switchReminderFor', () => {
  it('interpolates the new voice label and role', () => {
    const reminder = switchReminderFor(base)
    expect(reminder).toContain('帅哥 (Handsome Guy)')
    expect(reminder).toContain('温柔绅士型帅哥')
    expect(reminder).toContain('<you_remembered_your_voice_the_way_you_were_taught_to_speak/>')
    expect(reminder.startsWith('<reminder>')).toBe(true)
    expect(reminder.endsWith('</reminder>')).toBe(true)
  })

  it('falls back to the id when label is empty', () => {
    const reminder = switchReminderFor({ ...base, label: '' })
    expect(reminder).toContain('(handsome-guy)')
  })
})

import { describe, expect, it } from 'vitest'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { injectSwitchReminder, switchReminderFor } from '../src/switch-reminder.ts'
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

describe('injectSwitchReminder', () => {
  it('injects a user-role message carrying the reminder text', () => {
    const injected: UserMessage[] = []
    const agent = {
      inbox: { nextStep: [], replace: () => false },
      inject: (message: UserMessage) => { injected.push(message) },
    }
    injectSwitchReminder(agent as never, base)
    expect(injected).toHaveLength(1)
    expect(injected[0]!.role).toBe('user')
    expect(injected[0]!.source).toEqual({ kind: 'plugin', plugin: 'dsh-voice' })
    expect(injected[0]!.content).toEqual([{ type: 'text', text: switchReminderFor(base) }])
  })

  it('replaces an earlier pending reminder instead of appending another one', () => {
    const pending = createUserMessage({
      content: [{ type: 'text', text: '<reminder>old</reminder>' }],
      source: { kind: 'plugin', plugin: 'dsh-voice' },
    })
    const replacement = { replaced: '', message: undefined as UserMessage | undefined }
    const agent = {
      inbox: {
        nextStep: [pending],
        replace: (id: string, message: UserMessage) => {
          if (id !== pending.id) return false
          replacement.replaced = id
          replacement.message = message
          return true
        },
      },
      inject: () => { throw new Error('must not append while a reminder is pending') },
    }

    injectSwitchReminder(agent as never, base)

    expect(replacement.replaced).toBe(pending.id)
    expect(replacement.message?.content).toEqual([{ type: 'text', text: switchReminderFor(base) }])
  })
})

import { describe, expect, it } from 'vitest'
import { listVoicesText, parseVoiceCommand } from '../src/command.ts'
import { listVoices } from '../src/voice-registry.ts'

describe('parseVoiceCommand', () => {
  it('treats empty input as show', () => {
    expect(parseVoiceCommand('')).toEqual({ kind: 'show' })
    expect(parseVoiceCommand('   ')).toEqual({ kind: 'show' })
  })

  it('treats "list" as show, case-insensitive', () => {
    expect(parseVoiceCommand('list')).toEqual({ kind: 'show' })
    expect(parseVoiceCommand(' LIST ')).toEqual({ kind: 'show' })
  })

  it('parses a tone id, lowercased', () => {
    expect(parseVoiceCommand('Handsome-Guy')).toEqual({ kind: 'set', id: 'handsome-guy' })
    expect(parseVoiceCommand('  concise ')).toEqual({ kind: 'set', id: 'concise' })
  })
})

describe('listVoicesText', () => {
  it('marks the active voice', () => {
    const text = listVoicesText(listVoices(), 'handsome-guy')
    expect(text).toContain('handsome-guy')
    expect(text).toContain('(current)')
  })
})

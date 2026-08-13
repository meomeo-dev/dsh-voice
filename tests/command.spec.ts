import { describe, expect, it } from 'vitest'
import { listVoicesText, parseVoiceCommand } from '../src/command.js'
import { listVoices } from '../src/voice-registry.js'

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
    expect(parseVoiceCommand('Ling')).toEqual({ kind: 'set', id: 'ling' })
    expect(parseVoiceCommand('  concise ')).toEqual({ kind: 'set', id: 'concise' })
  })
})

describe('listVoicesText', () => {
  it('marks the active voice', () => {
    const text = listVoicesText(listVoices(), 'ling')
    expect(text).toContain('ling')
    expect(text).toContain('(current)')
  })
})

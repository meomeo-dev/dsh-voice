import { describe, expect, it } from 'vitest'
import { voicePromptFor } from '../src/section.js'
import { DEFAULT_TONE_ID } from '../src/tones.js'
import { listVoices } from '../src/voice-registry.js'

const voices = listVoices()

describe('voicePromptFor', () => {
  it('returns the active voice prompt', () => {
    const guy = voices.find(v => v.id === 'handsome-guy')
    expect(guy).toBeDefined()
    expect(voicePromptFor(voices, 'handsome-guy')).toBe(guy!.prompt)
  })

  it('falls back to the default voice for an unknown id', () => {
    const fallback = voices.find(v => v.id === DEFAULT_TONE_ID)!.prompt
    expect(voicePromptFor(voices, 'no-such-tone')).toBe(fallback)
  })

  it('falls back to the default voice for an empty id', () => {
    const fallback = voices.find(v => v.id === DEFAULT_TONE_ID)!.prompt
    expect(voicePromptFor(voices, '')).toBe(fallback)
  })
})

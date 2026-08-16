import { describe, expect, it } from 'vitest'
import { detectEffectiveSwitch } from '../src/switch-detect.ts'
import { emptySelection, VOICE_OFF, type VoiceSelection } from '../src/selection.ts'

function sel(partial: Partial<VoiceSelection> = {}): VoiceSelection {
  return { ...emptySelection(), ...partial }
}

const KNOWN = new Set(['default', 'steve-jobs', 'pretty-girl'])

describe('detectEffectiveSwitch', () => {
  it('returns the new id when the effective voice changes', () => {
    const before = sel({ user: 'steve-jobs' })
    const after = sel({ user: 'pretty-girl' })
    expect(detectEffectiveSwitch(before, after, 's1', '/repo', 'default', 'default', KNOWN)).toBe('pretty-girl')
  })

  it('returns undefined when a shadowed level changes (session still wins)', () => {
    const before = sel({ user: 'steve-jobs', sessions: { s1: 'pretty-girl' } })
    const after = sel({ user: 'default', sessions: { s1: 'pretty-girl' } })
    expect(detectEffectiveSwitch(before, after, 's1', '/repo', 'default', 'default', KNOWN)).toBeUndefined()
  })

  it('returns undefined when the effective voice is unchanged', () => {
    const before = sel({ user: 'steve-jobs' })
    expect(detectEffectiveSwitch(before, before, 's1', '/repo', 'default', 'default', KNOWN)).toBeUndefined()
  })

  it('returns undefined when switching to off', () => {
    const before = sel({ user: 'steve-jobs' })
    const after = sel({ user: VOICE_OFF })
    expect(detectEffectiveSwitch(before, after, 's1', '/repo', 'default', 'default', KNOWN)).toBeUndefined()
  })

  it('returns the new id when switching from off to a valid voice', () => {
    const before = sel({ user: VOICE_OFF })
    const after = sel({ user: 'pretty-girl' })
    expect(detectEffectiveSwitch(before, after, 's1', '/repo', 'default', 'default', KNOWN)).toBe('pretty-girl')
  })

  it('returns undefined when the new effective id is unknown (fallback not registered)', () => {
    const before = sel({ user: 'steve-jobs' })
    const after = emptySelection()
    expect(detectEffectiveSwitch(before, after, 's1', '/repo', 'also-missing', 'missing-voice', KNOWN)).toBeUndefined()
  })

  it('accepts an undefined session id', () => {
    const before = sel({ user: 'steve-jobs' })
    const after = sel({ user: 'pretty-girl' })
    expect(detectEffectiveSwitch(before, after, undefined, '/repo', 'default', 'default', KNOWN)).toBe('pretty-girl')
  })
})

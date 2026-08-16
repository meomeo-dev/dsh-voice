import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  consumePending, detectEffectiveSwitch, emptySwitchState, markPending, noteEffectiveSwitch,
  parseSwitchState, readSwitchState, writeSwitchState,
  type SwitchState,
} from '../src/switch-state.ts'
import { emptySelection, VOICE_OFF, type VoiceSelection } from '../src/selection.ts'

function state(partial: Partial<SwitchState> = {}): SwitchState {
  return { ...emptySwitchState(), ...partial }
}

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
})

describe('markPending / consumePending', () => {
  it('consumes a pending reminder exactly once', () => {
    const marked = markPending(emptySwitchState(), 's1', 'steve-jobs')
    const first = consumePending(marked, 's1')
    expect(first.voiceId).toBe('steve-jobs')
    expect(first.next.pending).toEqual({})
    const second = consumePending(first.next, 's1')
    expect(second.voiceId).toBeUndefined()
  })

  it('overwrites a pending reminder for the same session', () => {
    const marked = markPending(markPending(emptySwitchState(), 's1', 'steve-jobs'), 's1', 'pretty-girl')
    expect(consumePending(marked, 's1').voiceId).toBe('pretty-girl')
  })

  it('isolates sessions', () => {
    const marked = markPending(markPending(emptySwitchState(), 's1', 'steve-jobs'), 's2', 'pretty-girl')
    expect(consumePending(marked, 's1')).toEqual({ voiceId: 'steve-jobs', next: { pending: { s2: 'pretty-girl' } } })
  })
})

describe('parseSwitchState', () => {
  it('parses a valid document', () => {
    expect(parseSwitchState('version: 1\npending:\n  s1: steve-jobs\n', 'switch-state.yaml')).toEqual({
      pending: { s1: 'steve-jobs' },
    })
  })

  it('returns empty on invalid YAML', () => {
    expect(parseSwitchState('{{{{', 'x')).toEqual(emptySwitchState())
  })

  it('returns empty on a non-object document', () => {
    expect(parseSwitchState('- a\n- b\n', 'x')).toEqual(emptySwitchState())
  })

  it('skips non-string entries and keeps the rest', () => {
    const parsed = parseSwitchState('pending:\n  s1: 7\n  s2: pretty-girl\n', 'x')
    expect(parsed.pending).toEqual({ s2: 'pretty-girl' })
  })
})

describe('writeSwitchState / readSwitchState', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'dsh-voice-switch-'))
    process.env.DSH_HOME = home
  })

  afterEach(() => {
    delete process.env.DSH_HOME
    rmSync(home, { recursive: true, force: true })
  })

  it('round-trips a state and re-reads it', () => {
    writeSwitchState(state({ pending: { s1: 'steve-jobs' } }))
    expect(readSwitchState().pending).toEqual({ s1: 'steve-jobs' })
  })

  it('returns empty when the file is missing', () => {
    expect(readSwitchState()).toEqual(emptySwitchState())
  })

  it('tolerates a corrupted file after a valid write', () => {
    writeSwitchState(state({ pending: { s1: 'steve-jobs' } }))
    writeFileSync(join(home, 'voice', 'switch-state.yaml'), '{{{ bad yaml')
    expect(readSwitchState()).toEqual(emptySwitchState())
  })

  it('noteEffectiveSwitch records a pending marker only on a real change', () => {
    const before = sel({ user: 'steve-jobs' })
    const after = sel({ user: 'pretty-girl' })
    noteEffectiveSwitch(before, after, 's1', '/repo', 'default', 'default', KNOWN)
    expect(readSwitchState().pending).toEqual({ s1: 'pretty-girl' })
  })

  it('noteEffectiveSwitch does not record when effective voice is unchanged', () => {
    const before = sel({ user: 'steve-jobs' })
    const shadowed = sel({ user: 'default', sessions: { s1: 'steve-jobs' } })
    noteEffectiveSwitch(before, shadowed, 's1', '/repo', 'default', 'default', KNOWN)
    expect(readSwitchState()).toEqual(emptySwitchState())
  })
})

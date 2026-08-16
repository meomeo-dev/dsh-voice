import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  emptySelection, parseSelection, readSelection, resolveEffectiveVoice, VOICE_OFF, writeSelection,
  type VoiceSelection,
} from '../src/selection.ts'

/** 构造 selection，缺省为空。 */
function sel(partial: Partial<VoiceSelection> = {}): VoiceSelection {
  return { ...emptySelection(), ...partial }
}

const KNOWN = new Set(['default', 'steve-jobs', 'pretty-girl'])

describe('resolveEffectiveVoice', () => {
  it('falls through to the final fallback when nothing is set', () => {
    expect(resolveEffectiveVoice(sel(), undefined, undefined, 'default', 'default', KNOWN)).toBe('default')
  })

  it('resolves session > workspace > user > legacy', () => {
    const selection = sel({
      user: 'pretty-girl',
      workspaces: { '/repo': 'steve-jobs' },
      sessions: { 's1': 'steve-jobs' },
    })
    expect(resolveEffectiveVoice(selection, 's1', '/repo', 'default', 'default', KNOWN)).toBe('steve-jobs')
    expect(resolveEffectiveVoice(selection, 'other', '/repo', 'default', 'default', KNOWN)).toBe('steve-jobs')
    expect(resolveEffectiveVoice(selection, 'other', '/elsewhere', 'default', 'default', KNOWN)).toBe('pretty-girl')
    expect(resolveEffectiveVoice(sel({ user: 'pretty-girl' }), 'other', '/elsewhere', 'default', 'default', KNOWN)).toBe('pretty-girl')
  })

  it('uses legacy user default when selection.user is unset', () => {
    expect(resolveEffectiveVoice(sel(), 's', '/x', 'steve-jobs', 'default', KNOWN)).toBe('steve-jobs')
  })

  it('off at any level terminates and blocks fallback', () => {
    expect(resolveEffectiveVoice(sel({ sessions: { s1: VOICE_OFF } }), 's1', '/repo', 'default', 'default', KNOWN)).toBe(VOICE_OFF)
    expect(resolveEffectiveVoice(sel({ workspaces: { '/repo': VOICE_OFF } }), 's1', '/repo', 'default', 'default', KNOWN)).toBe(VOICE_OFF)
    expect(resolveEffectiveVoice(sel({ user: VOICE_OFF }), 's1', '/repo', 'default', 'default', KNOWN)).toBe(VOICE_OFF)
  })

  it('skips an unknown id and continues to the next level', () => {
    const selection = sel({
      user: 'pretty-girl',
      sessions: { s1: 'deleted-voice' },
    })
    expect(resolveEffectiveVoice(selection, 's1', '/x', 'default', 'default', KNOWN)).toBe('pretty-girl')
  })
})

describe('parseSelection', () => {
  it('parses a valid document', () => {
    const parsed = parseSelection(
      'version: 1\nuser: steve-jobs\nworkspaces:\n  /repo: pretty-girl\nsessions:\n  s1: off\n',
      'selection.yaml',
    )
    expect(parsed).toEqual({
      user: 'steve-jobs',
      workspaces: { '/repo': 'pretty-girl' },
      sessions: { s1: 'off' },
    })
  })

  it('returns empty on invalid YAML', () => {
    expect(parseSelection('{{{{', 'x')).toEqual(emptySelection())
  })

  it('returns empty on a non-object document', () => {
    expect(parseSelection('- a\n- b\n', 'x')).toEqual(emptySelection())
  })

  it('skips non-string entries and keeps the rest', () => {
    const parsed = parseSelection(
      'user: 42\nworkspaces: "nope"\nsessions:\n  s1: 7\n  s2: pretty-girl\n',
      'x',
    )
    expect(parsed.user).toBeUndefined()
    expect(parsed.workspaces).toEqual({})
    expect(parsed.sessions).toEqual({ s2: 'pretty-girl' })
  })
})

describe('writeSelection / readSelection', () => {
  let home: string

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'dsh-voice-selection-'))
    process.env.DSH_HOME = home
  })

  afterEach(() => {
    delete process.env.DSH_HOME
    rmSync(home, { recursive: true, force: true })
  })

  it('round-trips a selection and re-reads it', () => {
    writeSelection(sel({ user: 'pretty-girl', sessions: { s1: 'off' } }))
    const read = readSelection()
    expect(read.user).toBe('pretty-girl')
    expect(read.sessions).toEqual({ s1: 'off' })
    expect(read.workspaces).toEqual({})
  })

  it('returns empty when the file is missing', () => {
    expect(readSelection()).toEqual(emptySelection())
  })

  it('tolerates a corrupted file after a valid write', () => {
    writeSelection(sel({ user: 'pretty-girl' }))
    // 直接写坏文件，readSelection 应静默回退为空 selection。
    writeFileSync(join(home, 'voice', 'selection.yaml'), '{{{ bad yaml')
    expect(readSelection()).toEqual(emptySelection())
  })
})

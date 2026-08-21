import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { HeroVoiceSeatController, type HeroVoiceSession } from '../src/client/hero-seat.ts'

function session(id: string, blank: boolean, cwd = '/repo'): HeroVoiceSession {
  return { id: id as SessionId, cwd, blank }
}

describe('HeroVoiceSeatController', () => {
  it('keeps a staged voice until a blank session becomes current', async () => {
    let current: HeroVoiceSession | undefined
    const setVoice = vi.fn(async () => {})
    const seat = new HeroVoiceSeatController(setVoice, () => current)

    await seat.select('steve-jobs')
    expect(setVoice).not.toHaveBeenCalled()
    expect(seat.snapshot()).toBe('steve-jobs')

    current = session('new-session', true)
    await seat.apply()
    expect(setVoice).toHaveBeenCalledWith('new-session', '/repo', 'session', 'steve-jobs')
    expect(seat.snapshot()).toBeNull()
  })

  it('does not consume the next voice when the current session has history', async () => {
    let current: HeroVoiceSession | undefined = session('old-session', false)
    const setVoice = vi.fn(async () => {})
    const seat = new HeroVoiceSeatController(setVoice, () => current)

    await seat.select('sun-wukong')
    expect(setVoice).not.toHaveBeenCalled()
    expect(seat.snapshot()).toBe('sun-wukong')

    current = session('new-session', true, '/workspace/project')
    await seat.apply()
    expect(setVoice).toHaveBeenCalledWith('new-session', '/workspace/project', 'session', 'sun-wukong')
    expect(seat.snapshot()).toBeNull()
  })

  it('consumes a staged voice after a failed write so the user can retry', async () => {
    const setVoice = vi.fn(async () => { throw new Error('write failed') })
    const seat = new HeroVoiceSeatController(setVoice, () => session('new-session', true))

    await seat.select('default').catch(() => {})
    expect(setVoice).toHaveBeenCalledOnce()
    expect(seat.snapshot()).toBeNull()
  })

  it('clears a staged value when the hero selects inherit', async () => {
    const setVoice = vi.fn(async () => {})
    const seat = new HeroVoiceSeatController(setVoice, () => undefined)

    await seat.select('default')
    await seat.select(null)
    expect(seat.snapshot()).toBeNull()
    expect(setVoice).not.toHaveBeenCalled()
  })
})

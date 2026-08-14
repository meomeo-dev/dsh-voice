import { describe, expect, it } from 'vitest'
import { findProjectRoot, listVoices } from '../src/voice-registry.js'

describe('listVoices', () => {
  it('loads the builtin default and handsome-guy voices', () => {
    const voices = listVoices()
    const ids = voices.map(v => v.id)
    expect(ids).toContain('default')
    expect(ids).toContain('handsome-guy')
  })

  it('returns voices sorted by id', () => {
    const ids = listVoices().map(v => v.id)
    expect(ids).toEqual([...ids].sort())
  })

  it('handsome-guy voice carries the identity and scenario sections', () => {
    const guy = listVoices().find(v => v.id === 'handsome-guy')
    expect(guy).toBeDefined()
    expect(guy!.prompt).toContain('帅哥')
    expect(guy!.prompt).toContain('说话方式')
    expect(guy!.prompt).toContain('场景示例')
  })
})

describe('findProjectRoot', () => {
  it('returns the resolved cwd when no .git marker exists above', () => {
    const root = findProjectRoot('/')
    expect(root).toBe('/')
  })
})

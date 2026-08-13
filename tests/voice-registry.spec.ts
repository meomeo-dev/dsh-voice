import { describe, expect, it } from 'vitest'
import { findProjectRoot, listVoices } from '../src/voice-registry.js'

describe('listVoices', () => {
  it('loads the builtin default and ling voices', () => {
    const voices = listVoices()
    const ids = voices.map(v => v.id)
    expect(ids).toContain('default')
    expect(ids).toContain('ling')
  })

  it('returns voices sorted by id', () => {
    const ids = listVoices().map(v => v.id)
    expect(ids).toEqual([...ids].sort())
  })

  it('ling voice carries the identity and scenario sections', () => {
    const ling = listVoices().find(v => v.id === 'ling')
    expect(ling).toBeDefined()
    expect(ling!.prompt).toContain('令')
    expect(ling!.prompt).toContain('说话方式')
    expect(ling!.prompt).toContain('场景示例')
  })
})

describe('findProjectRoot', () => {
  it('returns the resolved cwd when no .git marker exists above', () => {
    const root = findProjectRoot('/')
    expect(root).toBe('/')
  })
})

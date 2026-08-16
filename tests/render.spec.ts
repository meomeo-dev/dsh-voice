import { describe, expect, it } from 'vitest'
import { renderVoicePrompt } from '../src/render.ts'
import { DEFAULT_TEMPLATE } from '../src/voice-schema.ts'
import type { VoiceFileData } from '../src/voice-schema.ts'

function data(overrides: Partial<VoiceFileData> = {}): VoiceFileData {
  return {
    version: 2,
    id: 'test',
    label: 'Test',
    description: '',
    identity: { role: '助手', background: '一个助手。', address: '用户' },
    style: '直接回应。',
    examples: [
      { name: '场景一', turns: [{ speaker: '用户', text: '你好' }, { speaker: '助手', text: '你好' }] },
    ],
    template: '',
    ...overrides,
  }
}

describe('renderVoicePrompt', () => {
  it('renders identity, style, and examples via the default template', () => {
    const prompt = renderVoicePrompt(data())
    expect(prompt).toContain('你是助手。一个助手。')
    expect(prompt).toContain('【说话方式】')
    expect(prompt).toContain('直接回应。')
    expect(prompt).toContain('【场景示例】——「用户」即用户。')
    expect(prompt).toContain('场景一')
    expect(prompt).toContain('用户:你好')
  })

  it('omits the scenario section when examples is empty', () => {
    const prompt = renderVoicePrompt(data({ examples: [] }))
    expect(prompt).not.toContain('场景示例')
  })

  it('uses a custom template when provided', () => {
    const prompt = renderVoicePrompt(data({ template: '[{{identity.role}}] {{style}}' }))
    expect(prompt).toBe('[助手] 直接回应。')
  })

  it('exposes a non-empty default template', () => {
    expect(DEFAULT_TEMPLATE.length).toBeGreaterThan(0)
    expect(DEFAULT_TEMPLATE).toContain('{{identity.role}}')
    expect(DEFAULT_TEMPLATE).toContain('{{#each examples}}')
  })
})

import { describe, expect, it } from 'vitest'
import { migrateVoiceFileText, parseVoiceFile, serializeVoice, validateNewVoice } from '../src/voice-file.js'
import { CURRENT_VOICE_VERSION } from '../src/voice-schema.js'

const DEMO_PATH = '/voices/demo-tone.voice.yaml'

const V2 = `version: 2
id: demo-tone
identity:
  role: 助手
  background: 一个直接、可靠的 AI 助手。
  address: 用户
style: |
  - 以自然、清晰、直接的方式回应。
examples:
  - name: 场景一
    turns:
      - speaker: 用户
        text: 你好。
      - speaker: 助手
        text: 你好。
`

const V1 = `version: 1
id: demo-tone
prompt: |
  你是助手,一个直接、可靠的 AI 助手。你称用户为「用户」。

  【说话方式】
  - 以自然、清晰、直接的方式回应。

  【场景示例】——「用户」即用户。

  场景一 · 初次见面
  用户:你好。
  助手:你好。
`

describe('parseVoiceFile', () => {
  it('parses a valid v2 file and renders the prompt', () => {
    const voice = parseVoiceFile(V2, DEMO_PATH)
    expect(voice.id).toBe('demo-tone')
    expect(voice.version).toBe(2)
    expect(voice.identity.role).toBe('助手')
    expect(voice.identity.address).toBe('用户')
    expect(voice.examples).toHaveLength(1)
    // 渲染后的 prompt 含结构化字段拼接内容。
    expect(voice.prompt).toContain('你是助手')
    expect(voice.prompt).toContain('【说话方式】')
    expect(voice.prompt).toContain('场景一')
  })

  it('rejects an id that does not match the filename', () => {
    expect(() => parseVoiceFile('id: other-tone\nidentity:\n  role: x\n  background: y\nstyle: z\nexamples: []\n', DEMO_PATH)).toThrow(/match the file basename/)
  })

  it('rejects invalid YAML', () => {
    expect(() => parseVoiceFile('id: [unclosed\n', DEMO_PATH)).toThrow(/invalid YAML/)
  })

  it('rejects a non-object document', () => {
    expect(() => parseVoiceFile('- just\n- a list\n', DEMO_PATH)).toThrow(/YAML object mapping/)
  })
})

describe('migrateVoiceFileText', () => {
  it('migrates a v1 prompt into v2 structured fields', () => {
    const { data, changed } = migrateVoiceFileText(V1, DEMO_PATH)
    expect(changed).toBe(true)
    expect(data.version).toBe(CURRENT_VOICE_VERSION)
    expect(data.identity.role).toBe('助手')
    expect(data.identity.address).toBe('用户')
    expect(data.style).toContain('直接')
    expect(data.examples).toHaveLength(1)
    expect(data.examples[0]!.name).toBe('场景一 · 初次见面')
    expect(data.examples[0]!.turns).toHaveLength(2)
    expect(data.examples[0]!.turns[0]).toEqual({ speaker: '用户', text: '你好。' })
  })

  it('reports no change for an already-current file', () => {
    const { changed } = migrateVoiceFileText(V2, DEMO_PATH)
    expect(changed).toBe(false)
  })
})

describe('serializeVoice', () => {
  it('serializes to YAML and omits an empty template', () => {
    const { data } = migrateVoiceFileText(V1, DEMO_PATH)
    const out = serializeVoice(data)
    expect(out).toContain('version: 2')
    expect(out).toContain('identity:')
    expect(out).not.toContain('template')
    // 序列化结果可再次解析(round-trip)。
    expect(parseVoiceFile(out, DEMO_PATH).id).toBe('demo-tone')
  })
})

describe('validateNewVoice', () => {
  it('accepts a valid candidate and stamps the current version', () => {
    const voice = validateNewVoice({
      id: 'new-tone',
      identity: { role: '助手', background: '背景', address: '用户' },
      style: '直接回应。',
      examples: [],
    })
    expect(voice.version).toBe(CURRENT_VOICE_VERSION)
  })

  it('rejects an invalid id', () => {
    expect(() => validateNewVoice({ id: 'Not Valid', identity: { role: 'x', background: 'y' }, style: 'z', examples: [] })).toThrow(/must match/)
  })
})

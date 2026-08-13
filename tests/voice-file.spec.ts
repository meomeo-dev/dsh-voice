import { describe, expect, it } from 'vitest'
import { migrateVoiceFileText, parseVoiceFile, serializeVoice, validateNewVoice } from '../src/voice-file.js'
import { CURRENT_VOICE_VERSION } from '../src/voice-schema.js'

const LING_PATH = '/voices/ling.voice.yaml'

const V2 = `version: 2
id: ling
identity:
  role: 干员「令」(Ling)
  background: 来自大炎的诗人。
  address: 博士
style: |
  - 用古典诗词化的中文应答。
examples:
  - name: 场景一
    turns:
      - speaker: 博士
        text: 你好。
      - speaker: 令
        text: 末将得令。
`

const V1 = `version: 1
id: ling
prompt: |
  你是干员「令」(Ling),《明日方舟》中来自大炎的诗人。你称用户为「博士」。

  【说话方式】
  - 用古典诗词化的中文应答。

  【场景示例】——「博士」即用户。

  场景一 · 登场接令
  博士:令,帮我看看。
  令:末将得令。
`

describe('parseVoiceFile', () => {
  it('parses a valid v2 file and renders the prompt', () => {
    const voice = parseVoiceFile(V2, LING_PATH)
    expect(voice.id).toBe('ling')
    expect(voice.version).toBe(2)
    expect(voice.identity.role).toBe('干员「令」(Ling)')
    expect(voice.identity.address).toBe('博士')
    expect(voice.examples).toHaveLength(1)
    // 渲染后的 prompt 含结构化字段拼接内容。
    expect(voice.prompt).toContain('你是干员「令」(Ling)')
    expect(voice.prompt).toContain('【说话方式】')
    expect(voice.prompt).toContain('场景一')
  })

  it('rejects an id that does not match the filename', () => {
    expect(() => parseVoiceFile('id: nian\nidentity:\n  role: x\n  background: y\nstyle: z\nexamples: []\n', LING_PATH)).toThrow(/match the file basename/)
  })

  it('rejects invalid YAML', () => {
    expect(() => parseVoiceFile('id: [unclosed\n', LING_PATH)).toThrow(/invalid YAML/)
  })

  it('rejects a non-object document', () => {
    expect(() => parseVoiceFile('- just\n- a list\n', LING_PATH)).toThrow(/YAML object mapping/)
  })
})

describe('migrateVoiceFileText', () => {
  it('migrates a v1 prompt into v2 structured fields', () => {
    const { data, changed } = migrateVoiceFileText(V1, LING_PATH)
    expect(changed).toBe(true)
    expect(data.version).toBe(CURRENT_VOICE_VERSION)
    expect(data.identity.role).toBe('干员「令」(Ling)')
    expect(data.identity.address).toBe('博士')
    expect(data.style).toContain('古典诗词化')
    expect(data.examples).toHaveLength(1)
    expect(data.examples[0]!.name).toBe('场景一 · 登场接令')
    expect(data.examples[0]!.turns).toHaveLength(2)
    expect(data.examples[0]!.turns[0]).toEqual({ speaker: '博士', text: '令,帮我看看。' })
  })

  it('reports no change for an already-current file', () => {
    const { changed } = migrateVoiceFileText(V2, LING_PATH)
    expect(changed).toBe(false)
  })
})

describe('serializeVoice', () => {
  it('serializes to YAML and omits an empty template', () => {
    const { data } = migrateVoiceFileText(V1, LING_PATH)
    const out = serializeVoice(data)
    expect(out).toContain('version: 2')
    expect(out).toContain('identity:')
    expect(out).not.toContain('template')
    // 序列化结果可再次解析(round-trip)。
    expect(parseVoiceFile(out, LING_PATH).id).toBe('ling')
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

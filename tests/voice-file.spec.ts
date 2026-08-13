import { describe, expect, it } from 'vitest'
import { parseVoiceFile, validateNewVoice } from '../src/voice-file.js'
import { CURRENT_VOICE_VERSION } from '../src/voice-schema.js'

const LING_PATH = '/voices/ling.voice.yaml'

describe('parseVoiceFile', () => {
  it('parses a valid voice file', () => {
    const voice = parseVoiceFile('version: 1\nid: ling\nprompt: |\n  You are Ling.\n', LING_PATH)
    expect(voice.id).toBe('ling')
    expect(voice.version).toBe(1)
    expect(voice.prompt).toContain('You are Ling.')
  })

  it('migrates a version-less file to the current version', () => {
    const voice = parseVoiceFile('id: ling\nprompt: "You are Ling."\n', LING_PATH)
    expect(voice.version).toBe(CURRENT_VOICE_VERSION)
  })

  it('rejects an id that does not match the filename', () => {
    expect(() => parseVoiceFile('id: nian\nprompt: x\n', LING_PATH)).toThrow(/match the file basename/)
  })

  it('rejects an empty prompt', () => {
    expect(() => parseVoiceFile('id: ling\nprompt: ""\n', LING_PATH)).toThrow(/invalid voice shape/)
  })

  it('rejects invalid YAML', () => {
    expect(() => parseVoiceFile('id: [unclosed\n', LING_PATH)).toThrow(/invalid YAML/)
  })

  it('rejects a non-object document', () => {
    expect(() => parseVoiceFile('- just\n- a list\n', LING_PATH)).toThrow(/YAML object mapping/)
  })
})

describe('validateNewVoice', () => {
  it('accepts a valid candidate and stamps the current version', () => {
    const voice = validateNewVoice({ id: 'new-tone', prompt: 'Be direct.' })
    expect(voice.version).toBe(CURRENT_VOICE_VERSION)
  })

  it('rejects an invalid id', () => {
    expect(() => validateNewVoice({ id: 'Not Valid', prompt: 'x' })).toThrow(/must match/)
  })
})

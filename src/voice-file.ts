/**
 * `*.voice.yaml` 文件的解析、校验、迁移与序列化(纯函数,供插件与 CLI 共用)。
 * @module dsh-voice/voice-file
 */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { basename } from 'node:path'
import { CURRENT_VOICE_VERSION, VOICE_ID_PATTERN, VOICE_SCHEMA } from './voice-schema.js'
import type { VoiceExample, VoiceFile, VoiceFileData, VoiceIdentity } from './voice-schema.js'
import { renderVoicePrompt } from './render.js'

/** 单次校验/迁移失败。 */
export class VoiceFileError extends Error {
  /** 出错文件路径(有则填)。 */
  readonly path?: string
  /** 出错字段或原因分类。 */
  readonly reason: string

  constructor(reason: string, path?: string, options?: ErrorOptions) {
    super(path === undefined ? reason : `${path}: ${reason}`, options)
    this.name = 'VoiceFileError'
    this.reason = reason
    this.path = path
  }
}

/** voice 文件后缀。 */
export const VOICE_EXTENSION = '.voice.yaml'

/** 迁移函数:把一个旧版本的原始对象升到下一版本。 */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * 版本迁移链,key 是「迁移前」的版本号。链上每个迁移把 `raw` 规范化到
 * `key + 1`;连续应用直到 {@link CURRENT_VOICE_VERSION}。
 */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // v0(无 version 字段)→ v1:补 version。
  0: raw => ({ ...raw, version: 1 }),
  // v1(单一 prompt 字符串)→ v2:拆成 identity/style/examples 结构化字段。
  1: migrateV1toV2,
}

/** v1 → v2:把自由文本 prompt 拆成结构化字段(见 {@link splitPromptV1})。 */
function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const { version: _version, ...rest } = raw
  if (typeof raw.prompt === 'string' && raw.prompt.length > 0) {
    const { prompt: _prompt, ...others } = rest
    return { ...others, version: 2, ...splitPromptV1(raw.prompt) }
  }
  // 已是结构化形状(仅 version 标错):保守地只升版本。
  return { ...rest, version: 2 }
}

/**
 * 从 v1 的自由文本 prompt 解析出结构化字段。识别 v1 里约定好的
 * `【说话方式】` / `【场景示例】` 标记;识别失败则保守地把全文放进 `style`,
 * 不丢数据。
 */
function splitPromptV1(prompt: string): { identity: VoiceIdentity; style: string; examples: VoiceExample[] } {
  const styleMarker = '【说话方式】'
  const examplesMarker = '【场景示例】'
  const styleIdx = prompt.indexOf(styleMarker)
  const examplesIdx = prompt.indexOf(examplesMarker)

  if (styleIdx < 0 || examplesIdx < 0 || examplesIdx < styleIdx) {
    return {
      identity: { role: '', background: prompt, address: '用户' },
      style: prompt,
      examples: [],
    }
  }

  const identityText = prompt.slice(0, styleIdx).trim()
  const styleText = prompt.slice(styleIdx + styleMarker.length, examplesIdx).trim()
  const examplesText = prompt.slice(examplesIdx + examplesMarker.length).trim()
  return { identity: splitIdentityV1(identityText), style: styleText, examples: splitExamplesV1(examplesText) }
}

/** 从 v1 身份段拆出 role / background / address。 */
function splitIdentityV1(text: string): VoiceIdentity {
  const roleMatch = /^你是(.+?)[,，。]/.exec(text)
  const role = roleMatch?.[1]?.trim() ?? ''
  const background = roleMatch ? text.slice(roleMatch[0].length).trim() : text
  const addressMatch = /你称用户为「(.+?)」/.exec(text)
  return {
    role: role || text.trim(),
    background: background || text.trim(),
    address: addressMatch?.[1] ?? '用户',
  }
}

/** 从 v1 场景段拆出场景数组(每场景 `场景X · 名字` 起头,内部 `说话人:台词` 行)。 */
function splitExamplesV1(text: string): VoiceExample[] {
  const examples: VoiceExample[] = []
  let current: VoiceExample | undefined
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0) continue
    if (/^场景[一二三四五六七八九十百\d]+(?:\s*[·.、]\s*.+)?$/.test(line)) {
      if (current !== undefined) examples.push(current)
      current = { name: line, turns: [] }
      continue
    }
    const turn = /^([^:：\s][^:：]*)[:：]\s*(.*)$/.exec(line)
    if (current !== undefined && turn !== null && turn[1] !== undefined && turn[2] !== undefined) {
      current.turns.push({ speaker: turn[1].trim(), text: turn[2].trim() })
    }
  }
  if (current !== undefined) examples.push(current)
  return examples
}

/** 应用迁移链,把任意历史版本的原始对象升到当前版本。 */
function migrateVoice(raw: Record<string, unknown>, path: string): Record<string, unknown> {
  let current = raw
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > CURRENT_VOICE_VERSION) {
    throw new VoiceFileError(`version ${version} is newer than supported ${CURRENT_VOICE_VERSION}`, path)
  }
  let v = version
  while (v < CURRENT_VOICE_VERSION) {
    const migrate = MIGRATIONS[v]
    if (migrate === undefined) {
      throw new VoiceFileError(`no migration from version ${v}`, path)
    }
    current = migrate(current)
    v += 1
  }
  return current
}

/** 用 schemastery 校验迁移后的对象并归一化。 */
function validateVoice(raw: Record<string, unknown>, path: string): VoiceFileData {
  try {
    return VOICE_SCHEMA(raw as unknown as VoiceFileData)
  } catch (error) {
    throw new VoiceFileError('invalid voice shape', path, { cause: error })
  }
}

/** 校验 id 与文件名 basename 一致。 */
function assertIdMatchesPath(id: string, path: string): void {
  const fileId = basename(path).endsWith(VOICE_EXTENSION)
    ? basename(path).slice(0, -VOICE_EXTENSION.length)
    : basename(path)
  if (id !== fileId) {
    throw new VoiceFileError(`id "${id}" must match the file basename "${fileId}"`, path)
  }
}

/**
 * 从原始字符串解析一个 voice 文件:解析 YAML → 迁移版本 → 校验形状 → 校验 id。
 * @param text - 文件文本。
 * @param path - 文件路径,用于诊断与文件名一致性检查。
 * @returns 校验通过、尚未渲染的 voice 落盘形状。
 * @throws {VoiceFileError} 当 YAML 非法、迁移后形状非法、或 id 与文件名不符。
 */
export function parseVoiceFileData(text: string, path: string): VoiceFileData {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    throw new VoiceFileError('invalid YAML', path, { cause: error })
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new VoiceFileError('must be a YAML object mapping', path)
  }
  const data = validateVoice(migrateVoice(raw as Record<string, unknown>, path), path)
  assertIdMatchesPath(data.id, path)
  return data
}

/**
 * 解析并渲染一个 voice 文件为运行时形状。
 * @param text - 文件文本。
 * @param path - 文件路径。
 * @returns 含渲染后 `prompt` 的 voice。
 */
export function parseVoiceFile(text: string, path: string): VoiceFile {
  const data = parseVoiceFileData(text, path)
  return { ...data, prompt: renderVoicePrompt(data) }
}

/**
 * 迁移一个 voice 文件,返回迁移后的落盘形状与「是否发生了版本迁移」。
 * 供 `dsh-voice migrate` 决定是否需要写回。
 * @param text - 文件文本。
 * @param path - 文件路径。
 * @returns 迁移后数据与 changed 标志。
 */
export function migrateVoiceFileText(text: string, path: string): { data: VoiceFileData; changed: boolean } {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (error) {
    throw new VoiceFileError('invalid YAML', path, { cause: error })
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new VoiceFileError('must be a YAML object mapping', path)
  }
  const originalVersion = typeof (raw as Record<string, unknown>).version === 'number'
    ? (raw as Record<string, unknown>).version as number
    : 0
  const data = validateVoice(migrateVoice(raw as Record<string, unknown>, path), path)
  assertIdMatchesPath(data.id, path)
  return { data, changed: originalVersion < CURRENT_VOICE_VERSION }
}

/** 序列化一个 voice 落盘形状为 YAML(空 `template` 省略,渲染时回退默认模板)。 */
export function serializeVoice(data: VoiceFileData): string {
  const { template, ...rest } = data
  const doc = template.length > 0 ? data : rest
  return `${stringifyYaml(doc)}\n`
}

/**
 * 校验一个待新建的 voice 对象(不经过版本迁移)。`version` 缺省取当前版本。
 * @param candidate - 待写入的 voice 对象(含 identity/style/examples)。
 * @returns 归一化后的 voice 落盘形状。
 * @throws {VoiceFileError} 当形状非法。
 */
export function validateNewVoice(candidate: Record<string, unknown>): VoiceFileData {
  const withVersion = { version: CURRENT_VOICE_VERSION, ...candidate }
  try {
    const value = VOICE_SCHEMA(withVersion as unknown as VoiceFileData)
    if (!VOICE_ID_PATTERN.test(value.id)) {
      throw new VoiceFileError(`id "${value.id}" must match ${String(VOICE_ID_PATTERN)}`)
    }
    return value
  } catch (error) {
    if (error instanceof VoiceFileError) throw error
    throw new VoiceFileError('invalid voice shape', undefined, { cause: error })
  }
}

/**
 * voice 文件格式的 schema(单一真相源)。
 *
 * 校验以本文件的 schemastery schema 为准;`voice.schema.yaml` 是同一 schema
 * 的 JSON Schema 表达(由 `pnpm schema:gen` 从本文件生成),供第三方工具与
 * 人类阅读,不作为运行时校验输入。
 * @module dsh-voice/voice-schema
 */

import z from '@deepseek-ai/schemastery'

/** 当前 voice 文件格式版本。 */
export const CURRENT_VOICE_VERSION = 1

/** 一个 `*.voice.yaml` 文件的顶层形状。 */
export interface VoiceFile {
  /** 格式版本;缺省为 0,由 migrate 升到 {@link CURRENT_VOICE_VERSION}。 */
  version: number
  /** 稳定唯一标识,小写 kebab-case,须与文件名 basename 一致。 */
  id: string
  /** 展示名;空串时回退到 id。 */
  label: string
  /** 一句话说明。 */
  description: string
  /** 面向模型的口吻指导文本,非空。 */
  prompt: string
}

/** voice id 的命名规则(kebab-case),与文件名 basename 对齐。 */
export const VOICE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 校验并归一化 voice 文件内容的 schemastery schema。 */
export const VOICE_SCHEMA = z.object({
  version: z.number().step(1).min(0).default(0),
  id: z.string().min(1).required(),
  label: z.string().default(''),
  description: z.string().default(''),
  prompt: z.string().min(1).required(),
})

/** voice 文件的 JSON Schema 表达(供生成 `voice.schema.yaml` 与第三方工具)。 */
export function voiceJsonSchema(): object {
  return VOICE_SCHEMA.toJSON()
}

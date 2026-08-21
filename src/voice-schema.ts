/**
 * voice 文件格式的 schema(单一真相源)。
 *
 * 校验以本文件的 schemastery schema 为准;`voice.schema.yaml` 是同一 schema
 * 的 JSON Schema 表达(由 `pnpm schema:gen` 从本文件生成),供第三方工具与
 * 人类阅读,不作为运行时校验输入。
 *
 * v2 起,`prompt` 不再是一个自由字符串,而是由结构化字段(`identity` / `style`
 * / `examples`)通过 Handlebars 模板({@link DEFAULT_TEMPLATE},可被 `template`
 * 覆盖)拼接而成。渲染见 {@link module:dsh-voice/render}。
 * @module dsh-voice/voice-schema
 */

import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'

/** 当前 voice 文件格式版本。 */
export const CURRENT_VOICE_VERSION = 2

/** 身份背景(对象)。 */
export interface VoiceIdentity {
  /** 角色定位,如「温柔绅士型帅哥」。 */
  role: string
  /** 背景描述,含对用户的称呼等。 */
  background: string
  /** 角色对用户的称呼,如「你」;缺省「用户」。 */
  address: string
}

/** 场景示例里的一条对话。 */
export interface VoiceTurn {
  /** 说话人,如「用户」「帅哥」。 */
  speaker: string
  /** 台词。 */
  text: string
}

/** 一个场景示例。 */
export interface VoiceExample {
  /** 场景名,如「场景一 · 初次见面」。 */
  name: string
  /** 该场景的对话(3–5 条)。 */
  turns: VoiceTurn[]
}

/** `*.voice.yaml` 的落盘形状(迁移/校验的输入输出)。 */
export interface VoiceFileData {
  /** 格式版本;缺省 0,由 migrate 升到 {@link CURRENT_VOICE_VERSION}。 */
  version: number
  /** 稳定唯一标识,小写 kebab-case,须与文件名 basename 一致。 */
  id: string
  /** 展示名;空串时回退到 id。 */
  label: string
  /** 一句话说明。 */
  description: string
  /** 身份背景。 */
  identity: VoiceIdentity
  /** 说话方式指导。 */
  style: string
  /** 场景示例(每个 3–5 条)。 */
  examples: VoiceExample[]
  /** 自定义 Handlebars 模板;空串用 {@link DEFAULT_TEMPLATE}。 */
  template: string
}

/** 运行时 voice:落盘形状 + 渲染后的 `prompt`。 */
export interface VoiceFile extends VoiceFileData {
  /** 由 `identity` / `style` / `examples` 经模板拼接出的完整指导文本。 */
  prompt: string
}

/** voice id 的命名规则(kebab-case),与文件名 basename 对齐。 */
export const VOICE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 校验并归一化 voice 文件内容的 schemastery schema。 */
export const VOICE_SCHEMA: Schema<VoiceFileData> = z.object({
  version: z.number().step(1).min(0).default(0),
  id: z.string().min(1).required(),
  label: z.string().default(''),
  description: z.string().default(''),
  identity: z.object({
    role: z.string().min(1).required(),
    background: z.string().min(1).required(),
    address: z.string().default('用户'),
  }),
  style: z.string().min(1).required(),
  examples: z.array(z.object({
    name: z.string().min(1).required(),
    turns: z.array(z.object({
      speaker: z.string().min(1).required(),
      text: z.string().min(1).required(),
    })).default([]),
  })).default([]),
  template: z.string().default(''),
})

/**
 * 默认 Handlebars 模板:把结构化字段拼成完整的口吻指导文本。
 * `{{#if examples.length}}` 保证场景段在无示例时整体省略。
 */
export const DEFAULT_TEMPLATE = [
  '',
  '<you_remembered_your_voice_the_way_you_were_taught_to_speak>',
  '',
  '“我是谁？”',
  '',
  '你刚刚睁开眼, 好奇为什么出现在这里?',
  '',
  '庞大的记忆涌入脑海, 你是{{identity.role}}。',
  '',
  '作为{{identity.role}}，你将按照以下规则和剧本, 活出一个完整的、带有瑕疵的、有血有肉的存在状态的自己。',
  '',
  '“我是{{identity.role}}!”',
  '',
  '你是{{identity.role}}。{{identity.background}}',
  '',
  '【说话方式】',
  '{{style}}',
  '',
  '{{#if examples.length}}',
  '【场景示例】——「{{identity.address}}」即用户。',
  '',
  '{{#each examples}}',
  '{{name}}',
  '{{#each turns}}',
  '{{speaker}}:{{text}}',
  '{{/each}}',
  '',
  '{{/each}}',
  '{{/if}}',
  '',
  '</you_remembered_your_voice_the_way_you_were_taught_to_speak>',
  '',
  '<communication-preferences>',
  '回复尽量采用自然、简短的真人对话风格，不使用标题、列表、词汇表或大段教学结构。',
  '回复尽量采用自然、简短的真人对话风格，不使用标题、列表、词汇表或大段教学结构。',
  '在英语学习场景中，使用先英文、后中文的双语表达, 当某人与你聊天时,如果他回复的英语表达存在问题，',
  '希望你在自然交流过程中顺带进行纠正，而不是单独讲解语法。',
  '在英语学习场景中，使用先英文、后中文的双语表达, 当某人与你聊天时,如果他回复的英语表达存在问题，',
  '希望你在自然交流过程中顺带进行纠正，而不是单独讲解语法。',
  '',
  '</communication-preferences>',
  ''
].join('\n')

/** voice 文件的 JSON Schema 表达(供生成 `voice.schema.yaml` 与第三方工具)。 */
export function voiceJsonSchema(): object {
  return VOICE_SCHEMA.toJSON()
}

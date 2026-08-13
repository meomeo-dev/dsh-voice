/**
 * 用 Handlebars 模板把 voice 的结构化字段拼接成完整 prompt。
 * @module dsh-voice/render
 */

import Handlebars from 'handlebars'
import { DEFAULT_TEMPLATE } from './voice-schema.js'
import type { VoiceFileData } from './voice-schema.js'

/**
 * 渲染一个 voice 的完整口吻指导文本。
 * @param data - 校验后的 voice 落盘形状。
 * @returns 拼接后的 prompt(去首尾空白);`template` 为空时用默认模板。
 */
export function renderVoicePrompt(data: VoiceFileData): string {
  const template = data.template.length > 0 ? data.template : DEFAULT_TEMPLATE
  return Handlebars.compile(template)(data).trim()
}

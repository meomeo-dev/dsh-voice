/**
 * `/voice` 命令的参数解析与展示(纯函数)。
 * @module dsh-voice/command
 */

import type { VoiceFile } from './voice-schema.ts'

/** `/voice` 命令的解析结果:查看,或切换到某个口吻。 */
export type VoiceCommand =
  | { readonly kind: 'show' }
  | { readonly kind: 'set'; readonly id: string }

/** 命令用法回显文案。 */
export const USAGE = 'Usage: /voice [<id>|list]'

/**
 * 解析命令参数。无参与 `list` 都表示「查看当前口吻与可用列表」;
 * 其余输入当作目标口吻 id,并做小写化容错。
 * @param rawInput - 命令名之后的原始文本(含前导空白)。
 * @returns 解析结果。
 */
export function parseVoiceCommand(rawInput: string): VoiceCommand {
  const input = rawInput.trim().toLowerCase()
  if (input.length === 0 || input === 'list') return { kind: 'show' }
  return { kind: 'set', id: input }
}

/**
 * 渲染可用口吻列表,当前项标注 `(current)`。
 * @param voices - 当前可见的全部 voice。
 * @param active - 当前生效口吻 id。
 * @returns 多行列表文本。
 */
export function listVoicesText(voices: readonly VoiceFile[], active: string): string {
  return voices
    .map(voice => `  ${voice.id.padEnd(12)} ${voice.label || voice.id}${voice.id === active ? '  (current)' : ''}`)
    .join('\n')
}

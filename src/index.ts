/**
 * dsh-voice 插件入口:把「切换对话口吻」接到 harness 的三个接缝上——
 * `systemPrompt.section` 提供动态口吻文本,`settings` 持久化当前选择,
 * `commands` 提供 `/voice` 人机命令;并注册 `create-voice` 元技能。
 * 口吻来源是 voice 文件(内置 + 用户 + 项目),见 {@link module:dsh-voice/voice-registry}。
 * 所有注册都是 effect,随插件 fiber 一起销毁。
 * @module dsh-voice
 */

import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-skill'
import { DEFAULT_TONE_ID } from './tones.js'
import { voicePromptFor } from './section.js'
import { USAGE, listVoicesText, parseVoiceCommand } from './command.js'
import { listVoices } from './voice-registry.js'
import { parseSkillMarkdown } from './skill-md.js'

export const name = 'dsh-voice'
export const inject = ['systemPrompt', 'commands']

/** 用户可写设置命名空间。 */
const NAMESPACE = settingsNamespace('voice')

/** 用户可写的设置切片:当前口吻 id。 */
interface VoiceSettings {
  tone: string
}

/** 该命名空间的 schema,缺省回退到默认口吻。 */
const SCHEMA: z<VoiceSettings> = z.object({
  tone: z.string().default(DEFAULT_TONE_ID),
})

/** create-voice 元技能文件(随包发布,插件编译到 lib/ 后向上取包根)。 */
const CREATE_VOICE_SKILL_PATH = fileURLToPath(new URL('../skill/create-voice/SKILL.md', import.meta.url))

/** create-voice 技能目录;作为 resourceBase,让 SKILL.md 里的 `references/…` 相对路径可解析。 */
const CREATE_VOICE_SKILL_DIR = dirname(CREATE_VOICE_SKILL_PATH)

/** 安全地转成可读字符串。 */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 执行一次 `/voice` 命令:查看或切换口吻,切换结果持久化进 settings。
 * @param scope - 已注册的 voice 设置作用域。
 * @param invocation - 命令调用(含 rawInput、agent、signal)。
 * @returns 归一化的命令结果。
 */
async function executeVoiceCommand(
  scope: SettingsScope<VoiceSettings>,
  invocation: CommandInvocation,
): Promise<CommandResult> {
  const voices = listVoices(invocation.agent.session.header.cwd)
  const command = parseVoiceCommand(invocation.rawInput)

  if (command.kind === 'show') {
    const current = scope.get().tone
    return {
      kind: 'success',
      text: `Current tone: ${current}\n\nAvailable tones:\n${listVoicesText(voices, current)}`,
    }
  }

  const voice = voices.find(v => v.id === command.id)
  if (voice === undefined) {
    return {
      kind: 'error',
      text: `Unknown tone "${command.id}". Available: ${voices.map(v => v.id).join(', ')}.\n${USAGE}`,
    }
  }

  try {
    await scope.update({ tone: voice.id })
  } catch (error) {
    return { kind: 'error', text: `Failed to switch tone: ${describeError(error)}` }
  }
  return { kind: 'success', text: `Tone switched to ${voice.label || voice.id} (${voice.id}).` }
}

/**
 * 插件入口:注册口吻 section(始终),并在 settings 存在时注册设置命名空间与 `/voice` 命令;
 * 在 skills 存在时注册 `create-voice` 元技能。
 * @param ctx - Cordis 上下文。
 */
export function apply(ctx: Context): void {
  // 当前生效口吻。section 每次 assemble 都读它,切换即时生效。
  let activeTone = DEFAULT_TONE_ID

  // order 10:persona(0)之后、工具指导(100–199)之前。
  ctx.systemPrompt.section({
    name: 'voice:tone',
    order: 10,
    text: (context) => {
      const cwd = context.agent?.session.header.cwd
      return voicePromptFor(listVoices(cwd), activeTone)
    },
  })

  // settings 是可选服务;存在时接管 activeTone 的读写,并挂载 /voice。
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NAMESPACE, SCHEMA, { base: { tone: DEFAULT_TONE_ID } })
    activeTone = scope.get().tone
    scope.watch(next => {
      activeTone = next.tone
    })

    ctx.commands.register({
      name: 'voice',
      description: 'view or switch the conversation tone',
      input: { hint: '[<id>|list]' },
      handler: invocation => executeVoiceCommand(scope, invocation),
    })
  })

  // skills 是可选服务;存在时暴露 create-voice 元技能(模型与人皆可调用)。
  ctx.inject(['skills'], (sctx) => {
    const skill = parseSkillMarkdown(readFileSync(CREATE_VOICE_SKILL_PATH, 'utf8'))
    sctx.skills.register({
      name: skill.name,
      description: skill.description,
      source: 'bundled',
      resourceBase: { kind: 'directory', path: CREATE_VOICE_SKILL_DIR },
      invocation: { modelInvocable: true, userInvocable: true },
      content: skill.content,
    })
  })
}

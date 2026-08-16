/**
 * dsh-voice 插件入口:把「切换对话口吻」接到 harness 的接缝上——
 * `systemPrompt.section` 提供动态口吻文本(三级分层解析),
 * `settings` 提供 legacy 用户级默认,`commands` 提供 `/voice` 人机命令,
 * `webServer` 挂 `/voice/*` 路由供 Web UI 切换;并注册 `create-voice` 元技能。
 * 口吻来源是 voice 文件(内置 + 用户 + 项目),见 {@link module:dsh-voice/voice-registry}。
 * 三级选择(会话/工作区/用户)持久化在 {@link module:dsh-voice/selection}。
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
import { DEFAULT_TONE_ID } from './tones.ts'
import { voicePromptFor } from './section.ts'
import { USAGE, listVoicesText, parseVoiceCommand } from './command.ts'
import { listVoices } from './voice-registry.ts'
import { readSelection, resolveEffectiveVoice, VOICE_OFF, writeSelection } from './selection.ts'
import { detectEffectiveSwitch } from './switch-detect.ts'
import { injectSwitchReminder } from './switch-reminder.ts'
import { parseSkillMarkdown } from './skill-md.ts'
import VoiceRoutes from './routes.ts'

export const name = 'dsh-voice'
export const inject = ['systemPrompt', 'commands']

/** 用户可写设置命名空间(legacy 用户级默认)。 */
const NAMESPACE = settingsNamespace('voice')

/** 用户可写的设置切片:legacy 用户级默认口吻 id。 */
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
 * 执行一次 `/voice` 命令:查看或切换口吻。
 * `show` 显示三级分层后的生效口吻;`switch` 写用户级默认(selection.yaml.user)。
 * @param scope - 已注册的 voice 设置作用域(legacy 用户默认)。
 * @param invocation - 命令调用(含 rawInput、agent、signal)。
 * @returns 归一化的命令结果。
 */
async function executeVoiceCommand(
  scope: SettingsScope<VoiceSettings>,
  invocation: CommandInvocation,
): Promise<CommandResult> {
  const agent = invocation.agent
  const sessionId = agent.id
  const cwd = agent.session.header.cwd
  const voices = listVoices(cwd)
  const knownIds = new Set(voices.map(voice => voice.id))
  const selection = readSelection()
  const command = parseVoiceCommand(invocation.rawInput)

  if (command.kind === 'show') {
    const effective = resolveEffectiveVoice(selection, sessionId, cwd, scope.get().tone, DEFAULT_TONE_ID, knownIds)
    const current = effective === VOICE_OFF ? 'off' : effective
    return {
      kind: 'success',
      text: `Current tone: ${current}\n\nAvailable tones:\n${listVoicesText(voices, current)}`,
    }
  }

  // 切换点:切换前/后各算一次生效 voice,变化则把提醒注入为下一 turn 的用户消息。
  const noteSwitch = (next: ReturnType<typeof readSelection>): void => {
    const switchedTo = detectEffectiveSwitch(selection, next, sessionId, cwd, scope.get().tone, DEFAULT_TONE_ID, knownIds)
    if (switchedTo === undefined) return
    const voice = voices.find(item => item.id === switchedTo)
    if (voice !== undefined) injectSwitchReminder(agent, voice)
  }

  // `/voice off` 关闭口吻（写用户级 off），不要求存在名为 off 的 voice。
  if (command.id === VOICE_OFF) {
    const next = { ...selection, user: VOICE_OFF }
    try {
      writeSelection(next)
    } catch (error) {
      return { kind: 'error', text: `Failed to disable tone: ${describeError(error)}` }
    }
    noteSwitch(next)
    return { kind: 'success', text: 'Tone disabled (off).' }
  }

  const voice = voices.find(item => item.id === command.id)
  if (voice === undefined) {
    return {
      kind: 'error',
      text: `Unknown tone "${command.id}". Available: ${voices.map(item => item.id).join(', ')}.\n${USAGE}`,
    }
  }

  const next = { ...selection, user: voice.id }
  try {
    writeSelection(next)
  } catch (error) {
    return { kind: 'error', text: `Failed to switch tone: ${describeError(error)}` }
  }
  noteSwitch(next)
  return { kind: 'success', text: `Tone switched to ${voice.label || voice.id} (${voice.id}).` }
}

/**
 * 插件入口:注册口吻 section(始终)、settings legacy 默认与 `/voice` 命令、
 * `/voice/*` Web 路由、以及 `create-voice` 元技能。
 * @param ctx - Cordis 上下文。
 */
export function apply(ctx: Context): void {
  // legacy 用户级默认口吻(settings.voice.tone);section 每次 assemble 用它作回退。
  let legacyTone = DEFAULT_TONE_ID

  // order 10:persona(0)之后、工具指导(100–199)之前。
  ctx.systemPrompt.section({
    name: 'voice:tone',
    order: 10,
    text: (context) => {
      const agent = context.agent
      const sessionId = agent?.id
      const cwd = agent?.session.header.cwd
      const voices = listVoices(cwd)
      const knownIds = new Set(voices.map(voice => voice.id))
      const effective = resolveEffectiveVoice(readSelection(), sessionId, cwd, legacyTone, DEFAULT_TONE_ID, knownIds)
      // 关闭 voice 时返回空串,该 section 在渲染时被整体丢弃。
      if (effective === VOICE_OFF) return ''
      return voicePromptFor(voices, effective)
    },
  })

  // settings 是可选服务;存在时接管 legacy 默认的读写,并挂载 /voice。
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NAMESPACE, SCHEMA, { base: { tone: DEFAULT_TONE_ID } })
    legacyTone = scope.get().tone
    scope.watch(next => {
      legacyTone = next.tone
    })

    ctx.commands.register({
      name: 'voice',
      description: 'view or switch the conversation tone',
      input: { hint: '[<id>|list]' },
      handler: invocation => executeVoiceCommand(scope, invocation),
    })
  })

  // 挂 Web UI 路由(webServer 存在时激活;headless 下静默不挂)。
  ctx.plugin(VoiceRoutes)

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

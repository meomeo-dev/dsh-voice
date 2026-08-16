/**
 * 三级 voice 选择的 host HTTP 路由（loopback-only）。
 *
 * browser half 无法直达 host service，核心 API 网关是封闭契约，因此本插件
 * 挂自己的 `/voice/*` 路由，供 browser half 同源 `fetch`。路由只读/写
 * selection.yaml 与 voice 目录，循环回环地址（`127.0.0.1`）才提供；
 * 非 loopback host 时 fail-loud，防止网络暴露任意路径读取。
 * @module dsh-voice/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { DEFAULT_TONE_ID } from './tones.ts'
import { findProjectRoot, listVoices } from './voice-registry.ts'
import {
  readSelection, resolveEffectiveVoice, VOICE_OFF, writeSelection, type VoiceSelection,
} from './selection.ts'
import { detectEffectiveSwitch } from './switch-detect.ts'
import { injectSwitchReminder } from './switch-reminder.ts'

/** settings 命名空间 `voice` 的 branded key（与 index.ts 的 NAMESPACE 一致）。 */
const VOICE_NAMESPACE = settingsNamespace('voice')

/** 三级之一。 */
export type VoiceLevel = 'session' | 'workspace' | 'user'

/** `/voice/get` 与 `/voice/set` 返回的三级状态。 */
export interface VoiceState {
  /** 会话级 voice id；未设置 = null。 */
  session: string | null
  /** 工作区级 voice id；未设置 = null。 */
  workspace: string | null
  /** 用户级 voice id（含 legacy settings 回退后的值）。 */
  user: string
  /** 生效 voice id。 */
  effective: string
}

/** 单条 voice 选项（仅 id + label，browser 展示用）。 */
export interface VoiceOption {
  id: string
  label: string
}

/** 请求体字节上限。 */
const MAX_BODY_BYTES = 64 * 1024

/** 消息文本。 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** HTTP 失败（业务失败统一 400）。 */
class RouteError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'RouteError'
  }
}

/** 读一个 JSON 请求体（强制 application/json 触发 preflight + 体积上限）。 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const mediaType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') throw new RouteError(415, 'content type must be application/json')
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_BODY_BYTES) throw new RouteError(413, 'request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new RouteError(400, 'body is not JSON')
  }
}

/** 写一个 JSON 响应。 */
function writeJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

/** 读 body 中某个字段。 */
function field(body: unknown, name: string): unknown {
  if (typeof body !== 'object' || body === null) return undefined
  return (body as Record<string, unknown>)[name]
}

/** 读一个可选字符串字段；空串/非字符串视为缺省。 */
function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value === '') return undefined
  return value
}

/** 由 settings.voice.tone 读 legacy 用户默认；namespace 未注册时回退 DEFAULT。 */
function legacyUser(ctx: Context): string {
  const settings = ctx.get('settings') as { get?: (ns: unknown) => unknown } | undefined
  const section = settings?.get?.(VOICE_NAMESPACE) as { tone?: unknown } | undefined
  return typeof section?.tone === 'string' && section.tone !== '' ? section.tone : DEFAULT_TONE_ID
}

/** 由 sessionId 取 live agent（可选服务，不存在或会话未 live 时 undefined）。 */
function liveAgent(ctx: Context, sessionId: string | undefined): Agent | undefined {
  if (sessionId === undefined) return undefined
  const agents = ctx.get('agents') as { get?: (id: SessionId) => Agent | undefined } | undefined
  return agents?.get?.(sessionId as SessionId)
}

/** 组装三级状态 + voice 选项。 */
function voiceState(
  ctx: Context, sessionId: string | undefined, cwd: string | undefined,
): VoiceState & { voices: VoiceOption[] } {
  const selection = readSelection()
  const voices = listVoices(cwd)
  const knownIds = new Set(voices.map(voice => voice.id))
  const root = cwd === undefined ? undefined : findProjectRoot(cwd)
  let user: string
  if (selection.user === VOICE_OFF) user = VOICE_OFF
  else if (selection.user !== undefined && knownIds.has(selection.user)) user = selection.user
  else user = legacyUser(ctx)
  return {
    session: sessionId !== undefined ? selection.sessions[sessionId] ?? null : null,
    workspace: root !== undefined ? selection.workspaces[root] ?? null : null,
    user,
    effective: resolveEffectiveVoice(selection, sessionId, cwd, legacyUser(ctx), DEFAULT_TONE_ID, knownIds),
    voices: voices.map(voice => ({ id: voice.id, label: voice.label || voice.id })),
  }
}

/** 把一个 level 的写操作应用到 selection 副本上（不落盘，返回新值）。 */
function applyLevel(
  selection: VoiceSelection,
  level: VoiceLevel,
  sessionId: string | undefined,
  cwd: string | undefined,
  voiceId: string | null,
): VoiceSelection {
  const next: VoiceSelection = {
    user: selection.user,
    workspaces: { ...selection.workspaces },
    sessions: { ...selection.sessions },
  }
  if (level === 'user') {
    if (voiceId === null) delete next.user
    else next.user = voiceId
  } else if (level === 'session') {
    if (sessionId === undefined) throw new RouteError(400, 'session level requires sessionId')
    if (voiceId === null) delete next.sessions[sessionId]
    else next.sessions[sessionId] = voiceId
  } else {
    if (cwd === undefined) throw new RouteError(400, 'workspace level requires cwd')
    const root = findProjectRoot(cwd)
    if (voiceId === null) delete next.workspaces[root]
    else next.workspaces[root] = voiceId
  }
  return next
}

/** 挂 `/voice/list` `/voice/get` `/voice/set` 路由的子插件。 */
export default class VoiceRoutes {
  static inject = ['webServer', 'settings']

  constructor(ctx: Context) {
    // Loopback-only：这些路由读/写任意主机路径与 selection 文件，绝不能从
    // 网络接口可达。非 loopback 时 fail-loud，而不是静默降级。
    if (ctx.webServer.host !== '127.0.0.1') {
      throw new Error('dsh-voice: /voice/* is loopback-only; refuse to serve on a non-loopback host')
    }

    const serve = async (res: ServerResponse, run: () => Promise<unknown>): Promise<void> => {
      try {
        writeJson(res, 200, await run())
      } catch (error) {
        const status = error instanceof RouteError ? error.status : 400
        writeJson(res, status, { error: { message: messageOf(error) } })
      }
    }

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/voice/list',
      handler: async (req, res) => {
        await serve(res, async () => {
          const body = await readJsonBody(req)
          const cwd = optionalString(field(body, 'cwd'))
          return { voices: listVoices(cwd).map(voice => ({ id: voice.id, label: voice.label || voice.id })) }
        })
      },
    }), 'dsh-voice: /voice/list')

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/voice/get',
      handler: async (req, res) => {
        await serve(res, async () => {
          const body = await readJsonBody(req)
          return voiceState(ctx, optionalString(field(body, 'sessionId')), optionalString(field(body, 'cwd')))
        })
      },
    }), 'dsh-voice: /voice/get')

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/voice/set',
      handler: async (req, res) => {
        await serve(res, async () => {
          const body = await readJsonBody(req)
          const sessionId = optionalString(field(body, 'sessionId'))
          const cwd = optionalString(field(body, 'cwd'))
          const level = field(body, 'level')
          const voiceId = field(body, 'voiceId')

          if (level !== 'session' && level !== 'workspace' && level !== 'user') {
            throw new RouteError(400, 'level must be session, workspace, or user')
          }
          if (level === 'session' && sessionId === undefined) {
            throw new RouteError(400, 'session level requires sessionId')
          }
          if (level === 'workspace' && cwd === undefined) {
            throw new RouteError(400, 'workspace level requires cwd')
          }

          const selection = readSelection()
          const voices = listVoices(cwd)
          const knownIds = new Set(voices.map(voice => voice.id))

          // voiceId 为 null 表示清除该层覆盖（继承下级）；`off` 表示关闭该层；
          // 其余必须是已知 voice id。
          let target: string | null
          if (voiceId === null) {
            target = null
          } else {
            const id = optionalString(voiceId)
            if (id === undefined) throw new RouteError(400, 'voiceId must be a string, "off", or null')
            if (id !== VOICE_OFF && !knownIds.has(id)) throw new RouteError(400, `unknown voice "${id}"`)
            target = id
          }

          const next = applyLevel(selection, level, sessionId, cwd, target)
          writeSelection(next)
          // 切换点:生效 voice 变化则把提醒注入为下一 turn 的用户消息。
          const switchedTo = detectEffectiveSwitch(selection, next, sessionId, cwd, legacyUser(ctx), DEFAULT_TONE_ID, knownIds)
          if (switchedTo !== undefined) {
            const voice = voices.find(item => item.id === switchedTo)
            const agent = liveAgent(ctx, sessionId)
            if (voice !== undefined && agent !== undefined) injectSwitchReminder(agent, voice)
          }
          return voiceState(ctx, sessionId, cwd)
        })
      },
    }), 'dsh-voice: /voice/set')
  }
}

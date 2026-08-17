/**
 * browser half 的 host RPC 客户端：POST 到插件自有 `/voice/*` 路由并解码 JSON。
 * 只做线协议编解码与错误折叠，不解析业务数据。
 */

import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** 三级之一。 */
export type VoiceLevel = 'session' | 'workspace' | 'user'

/** 单条 voice 选项。 */
export interface VoiceOption {
  id: string
  label: string
}

/** `/voice/get` 与 `/voice/set` 返回的三级状态。 */
export interface VoiceState {
  session: string | null
  workspace: string | null
  user: string
  effective: string
  voices: VoiceOption[]
}

/**
 * POST 一个 JSON 请求到插件自有路由并解码 JSON 响应体。
 * @param path - 路由路径名（同源相对路径）。
 * @param body - 请求载荷。
 * @returns 解码后的值。
 * @throws 当 HTTP 失败或 host 返回 `{ error }`。
 */
export async function routeFetch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message ?? `请求失败 (${response.status})`)
  }
  return await response.json() as T
}

/** 读某会话/工作区的三级 voice 状态。`sessionId` 缺省（hero 屏）时只回 workspace/user。 */
export function getVoiceState(sessionId: SessionId | undefined, cwd: string | undefined): Promise<VoiceState> {
  return routeFetch<VoiceState>('/voice/get', { sessionId, cwd })
}

/** 写某一级的 voice 选择；`voiceId` 为 null 表示继承，`off` 表示关闭。 */
export function setVoice(
  sessionId: SessionId | undefined, cwd: string | undefined, level: VoiceLevel, voiceId: string | null,
): Promise<VoiceState> {
  return routeFetch<VoiceState>('/voice/set', { sessionId, cwd, level, voiceId })
}

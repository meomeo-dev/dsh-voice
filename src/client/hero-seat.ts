/**
 * Hero voice 席位控制器：把「下一个新 session 的 voice」暂存，等一个空白会话
 * 成为 current 时写为它的 session 级 voice（镜像 ui-agent-preset 的
 * AgentPresetSeatController「暂存 → 新建时应用」范式）。
 *
 * hero 屏没有 session，所以选择是暂存而非立即应用：stage() 只在内存里记下 voice id；
 * apply() 在会话列表变化时触发，当 current 会话仍 blank（没跑过 turn）就把暂存的
 * voice 经 /voice/set 写为 session 级，然后消费掉暂存（下次新建回到 user 默认）。
 * @module dsh-voice/hero-seat
 */

import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { VoiceLevel } from './api.ts'

/** 席位要写到的会话身份。 */
export interface HeroVoiceSession {
  /** 暂存选择要落到的新会话 id。 */
  readonly id: SessionId
  /** false 表示会话已跑过 turn——之后拒绝写入。 */
  readonly blank: boolean
}

/** 写入动作：与 api.ts 的 setVoice 同形。 */
export type HeroVoiceSet = (
  sessionId: SessionId | undefined,
  cwd: string | undefined,
  level: VoiceLevel,
  voiceId: string | null,
) => Promise<unknown>

/**
 * 暂存下一个新 session 的 voice，并在空白会话成为 current 时应用。
 */
export class HeroVoiceSeatController {
  /** 当前暂存的 voice id；`off` 也是合法值；undefined = 无暂存（继承）。 */
  private staged: string | undefined

  constructor(
    private readonly setVoice: HeroVoiceSet,
    /** 当前会话（hero 即将交接的那个），没有则为 undefined。 */
    private readonly currentSession: () => HeroVoiceSession | undefined,
  ) {}

  /**
   * 暂存一个 voice 选择（null 表示继承 = 清除暂存）。
   * @param voiceId - voice id 或 `off`；null 清除暂存。
   */
  stage(voiceId: string | null): void {
    this.staged = voiceId ?? undefined
  }

  /**
   * 当前暂存值（null = 无暂存 = 继承），供 hero 菜单项回显（对话框重开时据此初始化）。
   * @returns 暂存的 voice id，或 null。
   */
  snapshot(): string | null {
    return this.staged ?? null
  }

  /**
   * 把暂存选择写为当前会话的 session 级 voice（若有一个空白会话可接）。
   * 由调用方在会话列表变化时触发；也幂等地处理「会话已启动」的情况。
   * @returns 应用完成（无暂存或无会话时立即返回）。
   */
  async apply(): Promise<void> {
    const staged = this.staged
    const session = this.currentSession()
    if (staged === undefined || session === undefined) return
    // 会话已跑过 turn，其历史在自身组合下产生；拒绝覆盖，暂存不再有意义。
    if (!session.blank) {
      this.staged = undefined
      return
    }
    this.staged = undefined
    await this.setVoice(session.id, undefined, 'session', staged)
  }
}

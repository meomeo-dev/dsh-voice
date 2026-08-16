/**
 * voice 选择的服务接口：把「当前会话生效 voice」的解析暴露给其他插件。
 *
 * dsh-voice 的三级选择(会话 → 工作区 → 用户 → legacy 默认)是权威真相源;
 * 其他 bundle(如 dsh-voice-tts 的 per-voice 音色映射)经 `ctx.voice` 软读,
 * 无需重复实现折叠逻辑或直接读 selection.yaml。
 * @module dsh-voice/service
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { readSelection, resolveEffectiveVoice } from './selection.ts'
import { listVoices } from './voice-registry.ts'
import { DEFAULT_TONE_ID } from './tones.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** dsh-voice 的选择解析服务(可选软读,见 {@link VoiceService})。 */
    voice: VoiceService
  }
}

/** dsh-voice 的选择解析服务:给出某会话的生效 voice id。 */
export class VoiceService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'voice')
  }

  /** 软读 legacy 用户默认(`settings.voice.tone`);namespace 未注册时回退默认。 */
  private legacyTone(): string {
    const settings = this.ctx.get('settings') as { get?: (ns: unknown) => unknown } | undefined
    const section = settings?.get?.(settingsNamespace('voice')) as { tone?: unknown } | undefined
    return typeof section?.tone === 'string' && section.tone !== '' ? section.tone : DEFAULT_TONE_ID
  }

  /**
   * 解析某会话当前生效的 voice id(会话 → 工作区 → 用户 → legacy → 最终回退)。
   * 未知 id 逐级回退,`off` 立即终止。
   * @param sessionId - 当前会话 id(可能缺省)。
   * @param cwd - 当前工作目录(用于推导工作区键)。
   * @returns 生效 voice id,或 `off`。
   */
  resolveEffective(sessionId: string | undefined, cwd: string | undefined): string {
    const voices = listVoices(cwd)
    const knownIds = new Set(voices.map(voice => voice.id))
    return resolveEffectiveVoice(readSelection(), sessionId, cwd, this.legacyTone(), DEFAULT_TONE_ID, knownIds)
  }
}

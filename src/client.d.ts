/**
 * dsh-voice 对下游社区插件发布的 client 类型声明：声明 `voice.menu` 宿主槽，
 * 供 dsh-voice-tts 等插件 `import type {} from '@meomeo-dev/dsh-voice/client'`
 * 时拿到 SlotMap 合并。只有声明合并，无任何 runtime 值。
 *
 * 必须先 `import type {}` 目标模块，让本文件成为「模块」并使其 `declare module`
 * 走增强路径（而非把 @deepseek-ai/dsh-client-ui-slots 当作新模块覆盖）。
 */

import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * 🎙️ 下拉里的菜单项列表（session scope）。由 dsh-voice 声明并渲染；
     * 每个社区插件各注册自己的条目，共用同一个图标入口。
     */
    'voice.menu': { kind: 'list'; scope: 'session' }
    /**
     * 新建会话 hero 屏 🎙️ 下拉里的菜单项列表（root scope）。与 `voice.menu` 同构，
     * 但无 session；dsh-voice 与 dsh-voice-tts 各自注入条目，共用 hero 图标入口。
     */
    'voice.hero.menu': { kind: 'list'; scope: 'root' }
  }
}

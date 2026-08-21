# 设计：Web UI 中切换/查看会话 Voice（三级配置）

> 状态：设计（实现前定稿）。本文是 `docs/design.md` 的增量补充，只覆盖「在 Web GUI 里切换/查看 voice 的三级配置」这一件事。

## 1. 背景与现状

- dsh-voice 目前只有**用户级默认 voice**：`settings` 命名空间 `voice.tone`（`~/.dsh/settings.yaml`），由 `/voice` 命令写入，`ctx.systemPrompt.section` 读它作为 `activeTone`。
- 用户想要三级：
  1. **当前会话**的 voice（最具体）；
  2. **当前会话所在工作区/项目**默认的 voice；
  3. **用户级**默认 voice（现有能力，保留）。
- 入口在 **Web GUI 会话标题栏**：点标题栏出现下拉菜单「🎙️设置会话Voice」，点它弹出模态框，展示三级状态并各自可切换。

## 2. 关键调研结论（dsh 源码事实）

- **settings 是单用户层**（`dsh-settings` README：`Single user layer`），没有 per-session / per-workspace 作用域。三级配置**不能**都塞进 `ctx.settings`。
- **系统提示 section 回调有 agent 上下文**：`AssembleContext.agent?`（`@deepseek-ai/dsh-agent` 声明合并），因此 `ctx.systemPrompt.section` 的 `text(context)` 能拿到 `context.agent.id`（= SessionId）与 `context.agent.session.header.cwd`——足够做会话级 + 工作区级解析。
- **工作区/项目键**：用 `findProjectRoot(cwd)`（git 根）作为工作区键，与现有 project 级 voice 文件（`<repo>/.dsh/voice`）的语义一致，host section 与 browser 侧（session summary 有 `cwd`）都拿得到。
- **浏览器改 Web UI 的合法接缝 = Client Slot System + 双半包**（`dsh.client` manifest + `ctx.slots.register`）。会话标题栏的加号座是 `conversation.session.header.actions`（`list`、`scope: session`），现有 `ui-subagent`/`ui-jobs`/`ui-agent-preset` 都往这里挂按钮（触发按钮 + 下拉菜单 + 关闭外点）。这是本功能的 UI 入口。
- **host↔browser 桥 = 自有 HTTP 路由**：out-of-tree bundle 的 browser half 无法直达 host service；dsh-compass 的做法是 host half 用 `ctx.webServer.register` 挂 `/dir/*`、`/git/*` 路由，browser half `fetch('/xxx', ...)`（同源相对路径）。路由必须 **loopback-only**（`ctx.webServer.host !== '127.0.0.1'` 即 fail-loud），与 dsh-compass 一致。
- **host 侧 HTTP 路由注册 API**：`ctx.webServer.register({ kind: 'exact', path, handler })`；handler 收 `(req, res)`，返回 disposer。
- **browser 侧读 session cwd**：`ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd`（`SessionSummary.cwd?: string`），dsh-compass 同款。
- **模态框原语**：`@deepseek-ai/dsh-client-ui-primitives` 有 `Modal`（`open/onClose/title/children/footer`，Escape + mask 关闭）。若无专用麦克风图标则直接用 `🎙️` emoji 文本（需求原文即要求 emoji）。

## 3. 三级模型与统一持久化

### 3.1 统一存储：`~/.dsh/voice/selection.yaml`

三级配置**统一**落到一个文件（与用户经验一致，放在 `~/.dsh/voice/` 下，用独立文件名避开 `*.voice.yaml` 的 voice 定义发现）：

```yaml
version: 1
user: steve-jobs            # 用户级默认（可选；`off` = 关闭）
workspaces:                # 工作区级默认，键 = 绝对项目根（git 根）
  /Users/luojin/git/foo: pretty-girl
sessions:                  # 会话级，键 = SessionId
  <session-id>: off        # `off` = 该会话关闭 voice
```

- 文件名 `selection.yaml` 不以 `.voice.yaml` 结尾，**不会被** `voice-registry.listVoices` 的 `*.voice.yaml` 扫描当作 voice 定义——零冲突。
- 三级都「未设置 = 缺失键」，解析时逐级回退（见 §3.2）。
- `version` 字段预留迁移（沿用 `voice-file` 的 version 迁移惯例）。

### 3.2 生效解析（most-specific wins）

```
sessions[sessionId]  →  workspaces[findProjectRoot(cwd)]  →  user  →  settings.voice.tone(legacy)  →  DEFAULT_TONE_ID
```

- **关闭 voice（off）**：任一层的值若为保留值 `off`，立即终止并返回 `off`（该层显式关闭，**阻断回退**）——解决「配置后一直生效、无法关闭」。`off` 是 `VOICE_OFF` 常量，写入 selection.yaml 各层；section 遇 `off` 返回空串（口吻 section 整体丢弃）。
- `settings.voice.tone` 作为**只读 legacy 回退**：老用户已配的默认值继续生效，迁移平滑；新写入用户级默认走 `selection.yaml.user`。
- 任何一层引用**不存在的 voice id**（被删/被改名）时，该层**视为未设置**，回退到下一层，绝不中断。
- `resolveEffectiveVoice(selection, sessionId, cwd, legacyUser)` 是纯函数，单测覆盖（含 off 终止语义）。

## 4. 架构：双半包 + 两个接缝

```
dsh-voice/
├── src/                      # host half（Node，现有 + 增量）
│   ├── index.ts              # 现有 section + /voice；改为分层解析 + /voice 写 user 级
│   ├── selection.ts          # 新增：selection.yaml 读写（原子）+ 分层解析 + 容错
│   ├── routes.ts             # 新增：loopback-only /voice/list|get|set
│   └── ...(现有 voice-registry / voice-file / section / command ...)
├── src/client/               # browser half（全新）
│   ├── index.ts              # 注册 conversation.session.header.actions + locale
│   ├── VoiceSettingAction.tsx  # 🎙️ 触发按钮 + 下拉菜单
│   ├── VoiceSettingDialog.tsx  # 模态框（三级各一下拉）
│   ├── api.ts                # routeFetch（POST 到 /voice/*）
│   ├── locales.ts            # zh / en 文案
│   └── *.module.css
├── package.json              # + dsh.client manifest + exports["./client"] + tsdown/react dev deps
├── tsdown.config.ts          # node(ESM) + client(CJS closure) 两个 config
└── cordis.patch.yml          # 不变（仍一个 row：dsh-voice）
```

### 4.1 host half

- **section**（`index.ts`）：`text(context)` 内用 `context.agent` 拿 `sessionId` + `cwd`，调 `resolveEffectiveVoice(...)` 得到生效 voice id，再 `voicePromptFor(listVoices(cwd), effectiveId)`。读 selection 用轻量 mtime 缓存，文件被手改/移动后下次 assemble 自动重读。
- **`/voice` 命令**：保持现有 show/switch；`switch` 现在写 `selection.yaml.user`（与 UI 的用户级下拉一致），不再写 `settings.voice.tone`（legacy 保留读）。
- **路由**（`routes.ts`，loopback-only，`ctx.webServer.host !== '127.0.0.1'` 则 fail-loud）：
  - `POST /voice/list` `{ cwd }` → `{ voices: [{ id, label }] }`（`listVoices(cwd)` 的 id+label）。
  - `POST /voice/get` `{ sessionId, cwd }` → `{ session: id|null, workspace: id|null, user: id|null, effective: id, voices: [{id,label}] }`。
  - `POST /voice/set` `{ sessionId, cwd, level: 'session'|'workspace'|'user', voiceId: string|null }` → 写 selection.yaml（`null` = 清除该层覆盖），返回新 `{ session, workspace, user, effective }`。
  - 请求体读 JSON（content-type 校验 + 体积上限，沿用 dsh-compass 的 `readJsonBody` 姿势）；`voiceId` 只在 `null` 或「存在于 `listVoices`」时才写。

### 4.2 browser half

- `apply(ctx)`：`inject = ['slots','sessions','locale']`。
  - `ctx.effect(() => ctx.locale.register(NS, { zh, en }))`。
  - `ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({ name:'conversation.session.header.actions', id:'voice-setting', order: 20, locale: NS, inject: () => ({ ... }) }, VoiceSettingAction))`。
- **`inject` 脸**（来自 apply 闭包 ctx + routeFetch）：
  - `listState(sessionId, cwd)` → `POST /voice/get`
  - `setVoice(sessionId, cwd, level, voiceId)` → `POST /voice/set`
  - `sessionCwd(sessionId)` → `ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd`
- **`VoiceSettingAction`**（session scope，收到 `sessionId` + `useSessions`）：一个 🎙️ 触发按钮；点开渲染下拉菜单，菜单里一项「🎙️设置会话Voice」（也可顺带显示当前生效 voice label 作副标题）。点该项 → 打开 `VoiceSettingDialog`（`Modal`）。
- **`VoiceSettingDialog`**：`Modal` 内三行，每行 = 标签 + 下拉（`<select>` 或搜索式下拉）：
  1. 「当前会话」—— 可选「继承」（空）+ 全部 voice；当前值高亮。
  2. 「当前工作区」—— 同上，`null` 表示继承用户级。
  3. 「用户默认」—— 全部 voice（无「继承」，回退 DEFAULT）。
  - 切换即时 `setVoice`，成功后刷新本地三值 + 生效值显示。
  - 外部 voice 列表加载失败 / 无 voice 时给空态，不让面板崩。

## 5. 健壮性（用户可移动/手改配置）

- **读**：`selection.yaml` 缺失/非法 YAML/非对象 → 视为空 selection（`console.warn` 一次，不回崩）。
- **条目容错**：`user`/`workspaces`/`sessions` 任一字段类型不对、键非字符串、值非字符串，逐条跳过，其余照常。
- **写**：原子写（临时文件 + `rename`），避免半截文件。
- **voice id 失效**：引用不存在 voice → 该层视为未设置回退（§3.2），`/voice/set` 也拒绝写入不存在的 id。
- **loopback 守卫**：非 `127.0.0.1` 拒绝挂路由（防网络暴露）。

## 6. 非目标

- 不改 dsh 源码、不改 `api-proxy` 的 settings 白名单、不改 `conversation.session.header` 组件本身。
- 不做 voice 文件的编辑/创建（那属 `create-voice` 元技能）。
- 不做 voice 预览（播放）。
- 不做 per-session 的持久化到 SessionEventMap（会话级用 selection.yaml，进程无关、简单）。

## 7. 验收标准（AC）

1. 会话标题栏出现 🎙️ 按钮；点它出现下拉菜单含「🎙️设置会话Voice」。
2. 点「🎙️设置会话Voice」弹出模态框，显示三行：当前会话 / 当前工作区 / 用户默认，各自显示当前值。
3. 任一行切换 voice 后，该层生效；`/voice` 命令 `show` 与系统提示 section 随之反映新的生效 voice。
4. **关闭 voice**：任一层（会话/工作区/用户）可设为 `off`，`off` 阻断回退、系统提示 section 不再注入口吻；`/voice off` 关闭用户级默认。
5. 会话级覆盖优先于工作区级、优先于用户级、优先于 DEFAULT（`resolveEffectiveVoice` 单测断言，含 `off` 终止语义）。
6. 手动删除/改坏 `~/.dsh/voice/selection.yaml`（非法 YAML、未知 id、错类型）→ 不影响 dsh-voice 使用，逐级回退。
7. 非 loopback host 时插件 fail-loud，不暴露 `/voice/*`。
8. `pnpm test` + `pnpm build`（tsdown 双半包）通过；`dsh --dump-config` 仍只见一个 `dsh-voice` row。

## 8. 改造面（文件清单）

| 文件 | 动作 |
|---|---|
| `src/selection.ts` | 新增 |
| `src/routes.ts` | 新增 |
| `src/index.ts` | 改（section 分层解析、`/voice` 写 user 级、挂 routes 子插件） |
| `src/client/{index,VoiceSettingAction,VoiceSettingDialog,api,locales}.ts` + CSS | 新增 |
| `package.json` | 改（`dsh.client`、`exports["./client"]`、dev deps: tsdown/react/react-dom/@types/react、prepare/build=tsdown） |
| `tsdown.config.ts` | 新增 |
| `tsconfig.json` | 改（jsx、moduleResolution bundler、paths 指向 `../deepseek-harness` types） |
| `tests/{selection,routes}.spec.ts` | 新增 |
| `docs/voice-settings-web-ui.md` | 本文 |

> 「关闭 voice（off）」是同一批文件的语义增量：`VOICE_OFF` 常量 + `resolveEffectiveVoice` 的 off 终止（`selection.ts`）、`/voice/set` 接受 `off`（`routes.ts`）、section 空串丢弃 + `/voice off`（`index.ts`）、三级下拉各加「关闭」项（`VoiceSettingDialog.tsx`）。

## 9. 讨论 / 风险

- **user 级双源**：`settings.voice.tone`（legacy）与 `selection.yaml.user`（新主源）并存。解析时 `user` 优先于 `settings`，`/voice` 与新 UI 都写 `selection.yaml.user`，避免新写入分叉；老用户已配的 `settings.voice.tone` 仍读作回退，不丢。
- **loopback 假设**：默认 Web GUI 是本地 `127.0.0.1`。远程浏览器场景本插件拒绝提供 voice 路由（与 dsh-compass / 默认 web posture 一致）。若要支持远程，需另加鉴权，超出本期。
- **构建切换**：由纯 `tsc` 改为 `tsdown`（node ESM + client CJS closure），是双半包的既定做法（dsh-compass 同构）。需回归 node half 的 `voices/` 与 `skill/` 相对路径解析（`import.meta.url` 相对包根，仍成立）。

## 10. 新建会话 hero 屏入口（「下一个 session」暂存→应用）

### 10.1 背景与机制

header 的 🎙️ 挂在 `conversation.session.header.actions`，但 `ConversationSessionHeader` 在空白阶段隐藏整个 header，新建会话的 hero 屏无从选 voice。harness 在 hero 工作区行（agent 预设 chip 之后）暴露了一个 `conversation.hero.voice` **list slot**（`scope: root`，空席位渲染为空），本插件与 dsh-voice-tts 各自注册条目、互不感知。

hero 屏**没有 session id**，而 `voice.menu` 是 `scope: session`，故本插件声明一个 root 作用域宿主槽 `voice.hero.menu`（镜像 session 的 `voice.menu`），并把 hero 🎙️ 触发器注册进 `conversation.hero.voice`（id `voice-setting-hero`）；触发器点开渲染 `voice.hero.menu`，本插件往里放「设置会话Voice」菜单项（id `voice-hero-menu`）。

### 10.2 三级对话框的「新建会话」级（stage，非立即写）

hero 菜单项复用了 header 的 `VoiceSettingDialog`，但 `session` 行语义改为 **「本次新建会话」**（label `新建会话` / `Next session`）：

- 该行选择走 `stageSession`（而非 `select('session')` 立即写），只在内存席位 `HeroVoiceSeatController` 里暂存，并在对话框本地回显（`stagedSession` 快照初始化、选择即更新本地态，不依赖服务端往返）。
- `workspace` 行用当前选中工作区的 `cwd`（`ctx.workspaces.list` 的 `recentWorkspaceId` → `path`）立即写工作区级；`user` 行立即写用户级。

### 10.3 `HeroVoiceSeatController`：stage → 空白会话成为 current 时应用

镜像 `ui-agent-preset` 的 `AgentPresetSeatController`（`stage` / `select` / `apply` 同构）：

- `stage(voiceId)` 只暂存；`select(voiceId)` = `stage` + 立即 `apply`。
- `apply()`：当 `sessions.list` 的 current 会话存在且 `blank`（没跑过 turn）时，`POST /voice/set { sessionId, cwd, level:'session', voiceId }` 写为 session 级，然后消费暂存；若 current 已非 blank（历史早于选择）则保留暂存，等待后续真正的空白 session，拒绝覆盖已有历史。
- `select()` 的立即 `apply` 覆盖「hero 屏就是一个已 current 的空白会话」的情形——此时发送首条消息只会把它翻为非 blank、**不引入新 session id**，单靠 list-change applier 会因 `!blank` 丢弃选择。list-change applier（`sessions.list.subscribe`）仍保留，覆盖「会话稍后才出现」的情形。

### 10.4 与 dsh-voice-tts 的共存

`conversation.hero.voice` 是 `list` slot，dsh-voice（🎙️，id `voice-setting-hero`）与 dsh-voice-tts（🔊 回落，id `voice-tts-hero-fallback`）各注册一个条目；dsh-voice-tts 的回落只在 `voice.hero.menu` 未声明（未装 dsh-voice）时渲染，否则返回 null，避免重复图标。dsh-voice-tts 还把 TTS 菜单项注入 `voice.hero.menu`，与「设置会话Voice」共用 hero 🎙️ 下拉。

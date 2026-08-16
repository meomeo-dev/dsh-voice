# Voice 切换提醒 — 用户故事

## 背景

dsh-voice 允许用户在一段会话中随时切换「对话口吻」(voice)。切换后,`voice:tone` section
会在下一次 assemble 时把新的 voice 指导文本注入 system prompt。但历史会话里,模型此前
已经以旧 voice 身份回应过——只替换指导文本,模型未必会主动「重新代入」新身份。

因此需要一条**一次性转向提醒**:当「当前会话生效的 voice」发生变化时,在下个 turn 注入
一条 `<reminder>…</reminder>`,提醒模型身份已切换、请重新代入。该提醒**只消费一次**。

关键语义:

- **「生效 voice」= 3 级配置按优先级折叠后的结果**(会话 → 工作区 → 用户 → legacy 默认)。
  只有这个折叠值变化才算「切换」;改动被更高优先级层遮蔽的层级,不算切换。
- 触发点是**切换动作本身**(写 selection 处),而不是 assemble 时靠历史记录前后对比——
  历史会话没有「切换前」记录,靠对比会漏掉首次切换。
- 发送时机是**下个 turn**:提醒作为一条 user 消息经 `agent.inject()` 注入 next-step 队列
  (不唤醒 driver),随用户下一条消息开启的下一 turn 一起发出,成为该 turn 的第一条 user 消息。

---

## US-1 · 历史会话切换生效 voice → 下个 turn 提醒一次(核心)

**As a** 正在回看历史对话的用户,
**I want** 在同一个会话里把 voice 从 A 切到 B,继续发消息时模型知道自己换了身份,
**so that** 模型不再沿用旧 voice 的口吻。

- **Given** 会话 S 有一段历史,此前模型以 voice A 的身份回应过。
- **When** 用户通过 🎙️ 把「会话级」voice 从 A 改为 B,然后发出下一条消息。
- **Then** 下个 turn 作为第一条 user 消息注入一次 `<reminder>用户切赋予你(B)了新的身份…</reminder>`,排在用户真实消息之前。
- **And** 之后的 turn 不再重复注入。

## US-2 · 切换非生效层级不提醒(优先级折叠)

**As a** 用户在会话 S 里已设了「会话级」voice = A,
**I want** 改动「用户级」voice 时不触发提醒,
**so that** 当前会话的口吻实际上没变时,不会出现多余的身份切换提示。

- **Given** 会话 S 生效 voice = A(session 级覆盖)。
- **When** 用户把「用户级」voice 从 X 改成 Y(但 session 级 A 仍生效)。
- **Then** 当前会话生效 voice 仍为 A → 不注入任何提醒。

## US-3 · 切到 off 不提醒,off → 有效 voice 要提醒

**As a** 用户要临时关闭 voice 或重新开启,
**I want** off 不产生「新身份」提醒,而从 off 切回某个 voice 时正常提醒,
**so that** 关闭动作安静、重新启用时模型重新代入。

- **Given** 会话 S 生效 voice = A。
- **When** 用户把生效 voice 切到 off。
- **Then** `voice:tone` 指导消失,且**不**注入「新身份」提醒(off 没有身份)。

- **Given** 会话 S 生效 voice = off。
- **When** 用户把生效 voice 切回 B。
- **Then** 下个 turn 注入一次 `<reminder>…(B)…</reminder>`。

## US-4 · 连续多次切换、期间未发言 → 只提醒最终值一次

**As a** 用户在发消息前反复试了几个 voice,
**I want** 只在下个 turn 提醒最终生效的那个 voice,
**so that** 不会把中间试过的 voice 都当作「切换」逐条提醒。

- **Given** 会话 S 当前生效 voice = A,且没有待提醒的残留标记。
- **When** 用户连续切换 A→B→C,期间未发出任何消息。
- **Then** 待提醒标记被覆盖为 C;下个 turn 只注入一次关于 C 的提醒。

## US-5 · 提醒恰好消费一次,不重复

**As a** 用户切换 voice 后连续发言多轮,
**I want** 提醒只在切换后的第一个 turn 出现,
**so that** 后续每轮不会被同一条身份切换提示打扰。

- **Given** 用户切换 voice 到 B,已在下个 turn 提醒过一次。
- **When** 用户继续发第 2、第 3 条消息。
- **Then** 这些 turn 均不再包含该提醒。

## US-6 · 新会话首次设 voice → 提醒一次(从 fallback 切到新身份)

**As a** 用户在全新会话里第一次选定 voice,
**I want** 下个 turn 注入一次身份提醒,
**so that** 模型明确「现在是 B 身份」而非通用默认口吻。

- **Given** 全新会话 S,生效 voice = fallback(default)。
- **When** 用户把生效 voice 设为 B,并发出第一条消息。
- **Then** 下个 turn 注入一次 `<reminder>…(B)…</reminder>`。

## US-7 · 切换后 voice 文件被删 → 静默跳过,不阻塞

**As a** 用户切换到了某个 voice,但该 voice 文件随后被删除/移动,
**I want** 提醒逻辑静默跳过而非抛错,
**so that** 缺失的 voice 不影响会话继续。

- **Given** 会话 S 有一个待提醒的 voice id = D。
- **When** 切换发生时,D 已不在可见 voice 集合中(或在下个 turn 前被删)。
- **Then** 不注入提醒(也不重复),`voice:tone` 按既有回退逻辑处理(回退到 default)。

---

## 非目标

- 不提醒「模型自己内部想要切换 voice」——只有用户显式写 selection 才可能触发。
- 不跨会话:提醒经 `agent.inject()` 进入目标会话的 inbox,天然按会话隔离,不继承。
- 不改 `voice:tone` 的既有回退/渲染逻辑;提醒是独立 user 消息,失败静默。

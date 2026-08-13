# dsh-voice 设计文档

## 1. 背景与目标

DeepSeek Harness 的 system prompt 由 `dsh-system-prompt` 这一 registry(注册器)组装:各插件通过 `ctx.systemPrompt.section()` 贡献有序段落,由 loop 在每个 step 前 `assemble()` 一次并 `renderPrompt()` 插值渲染。这给「切换对话口吻」提供了自然的挂点——**口吻不是改代码,而是往 prompt 里塞一段动态文本**。

本插件(`dsh-voice`)实现:

- 一个可切换的「对话口吻」机制:用户会话中随时 `/voice <id>` 切换,立即生效并持久化。
- 口吻**文件驱动**:每个口吻是一个 `*.voice.yaml` 文件,从内置/用户/项目三层目录发现,同名按优先级覆盖。
- 一个 `create-voice` 元技能,引导新建口吻文件到配置目录。

## 2. 机制设计(harness 接缝)

三个接缝各司其职,都不改 loop:

| 接缝 | 用途 | 关键决策 |
|---|---|---|
| `ctx.systemPrompt.section()` | 贡献口吻文本进 system prompt | `order: 10`——persona(`0`)之后、工具指导(`100–199`)之前;`text` 用 provider `() => …`,每次 assemble 重新求值 |
| `ctx.settings` | 持久化当前口吻 id | 口吻是用户运行时可改的偏好,用 settings 而非 cordis config;`base` 放默认,用户层覆盖,热更新 live |
| `ctx.commands` | `/voice` 人机命令 | handler 只读 `invocation.rawInput`,不发给模型 |
| `ctx.skills` | `create-voice` 元技能 | 模型与人皆可调用,指导新建 voice 文件 |

数据流:

```
voice 文件(内置/用户/项目) ──listVoices()──▶ 口吻集合
settings(用户层) ──watch──▶ activeTone ──▶ voicePromptFor() ──▶ systemPrompt section
```

## 3. voice 文件格式

一个 `*.voice.yaml` 文件即一个口吻定义。自 v2 起,`prompt` 不再是自由字符串,而是由结构化字段通过 Handlebars 模板拼接:

```yaml
version: 2            # 缺省 0,由 migrate 升到当前版本
id: ling              # 必填,kebab-case,须与文件名 basename 一致
label: 令 (Ling)      # 空串回退到 id
description: ...      # 一句话说明
identity:             # 身份背景(对象)
  role: 干员「令」(Ling)
  background: 来自大炎的诗人……
  address: 博士       # 角色对用户的称呼
style: |              # 说话方式(字符串)
  ...
examples:             # 场景示例(数组,每个 3–5 条对话)
  - name: 场景一 · 登场接令
    turns:
      - speaker: 博士
        text: ...
template: ...         # 可选,自定义 Handlebars 模板覆盖默认拼接
```

最终 `prompt` 由 `src/render.ts` 用 Handlebars 渲染:`你是{{identity.role}}。{{identity.background}}` + `【说话方式】` + `{{style}}` + `【场景示例】`(`examples` 非空时)。默认模板在 `src/voice-schema.ts` 的 `DEFAULT_TEMPLATE`,空 `template` 回退到它。

形状由 `src/voice-schema.ts`(schemastery)校验,是单一真相源;`voice.schema.yaml` 是同一 schema 的 JSON Schema 表达,由 `pnpm schema:gen` 生成,供第三方工具与人类阅读。

### 版本与迁移

`version` 字段为格式演进预留。`src/voice-file.ts` 维护一条迁移链 `MIGRATIONS`(key = 迁移前版本),加载时把任意历史版本连续升到 `CURRENT_VOICE_VERSION`(当前为 2)。迁移链:

- `0 → 1`:补 `version` 字段。
- `1 → 2`:把 v1 的单一 `prompt` 字符串拆成 `identity` / `style` / `examples`(识别 `【说话方式】`/`【场景示例】` 标记;识别失败保守地把全文放进 `style`)。

`dsh-voice migrate` 会把旧文件原地写回为当前版本。坏文件在发现阶段跳过并告警,不阻断整体。

## 4. voice 目录发现

优先级(低 → 高,同名后者覆盖):

```
内置(包内 voices/) < 用户 ~/.agents/voice < 用户 ~/.dsh/voice
  < 项目 <repo>/.agents/voice < 项目 <repo>/.dsh/voice
```

即:项目覆盖用户覆盖内置;同级 `.dsh` 优先于 `.agents`。这与 harness 的 skill 双根约定(`.dsh` / `.agents`)对齐。项目根由 `.git` 标记向上探测。读取是同步的(voice 文件少而小),结果按 project root 缓存。

**写根**(create-voice 落盘):用户级 `~/.dsh/voice` 优先,`.agents` 环境回退 `~/.agents/voice`;项目级 `<repo>/.dsh/voice` 优先,回退 `<repo>/.agents/voice`。

## 5. create-voice 元技能

`skill/create-voice/SKILL.md` 是标准的 SKILL.md(带 frontmatter),插件把它注册进 `ctx.skills`(runtime skill,`modelInvocable` + `userInvocable`)。流程是把「初始化令」那套总结成可复用 SOP:

1. **搜集角色**——识别目标,搜索权威档案与真实台词原文。
2. **分析说话方式**——从台词归纳 4–8 条可执行风格规则,附一条「不得因文害意」硬约束。
3. **写口吻文本**——结构化字段:`identity`(role/background/address)+ `style` + `examples`(10 个场景,每个 3–5 条,场景互不相同),由 Handlebars 模板拼接成最终 prompt。
4. **落盘校验**——写 `<id>.voice.yaml` 到 voice 目录,`dsh-voice check` 校验。

## 6. 检查/迁移工具

`bin/dsh-voice.mjs` 是随包发布的 CLI:

```sh
dsh-voice check [dir...]     # 校验 voice 文件形状(✓/✗)
dsh-voice migrate [dir...]   # 报告并校验到当前版本
```

## 7. 目录结构

```
dsh-voice/
├── package.json          # dsh.bundle + bin + peer 依赖
├── cordis.patch.yml      # bundle 配置层
├── voice.schema.yaml     # 生成的 JSON Schema
├── voices/               # 内置 voice(default、ling)
├── skill/create-voice/SKILL.md  # 元技能
├── bin/dsh-voice.mjs     # check/migrate CLI
├── src/
│   ├── index.ts          # 插件入口:section + settings + command + skill
│   ├── voice-schema.ts   # schema(真相源)
│   ├── voice-file.ts     # parse/validate/migrate(纯函数)
│   ├── voice-registry.ts # 目录发现 + 合并 + 缓存
│   ├── section.ts        # 口吻渲染(纯函数)
│   ├── command.ts        # /voice 解析与展示(纯函数)
│   └── skill-md.ts       # SKILL.md frontmatter 解析
├── scripts/gen-schema.mjs  # 生成 voice.schema.yaml
├── tests/
└── docs/design.md
```

分层原则:**文件解析/校验/迁移(voice-file)、目录发现(voice-registry)、渲染/命令解析(section/command)** 都是不依赖 cordis 的纯逻辑,CLI 与插件共用;`index.ts` 只做接缝编排。

## 8. 关键设计决策

- **口吻用 `section()`,不用 `variable()`**:口吻是整段 model-visible 指导,不是 `{{name}}` 占位。
- **文件驱动而非硬编码**:口吻是用户数据,应可增删、可覆盖,故用 voice 文件 + 目录发现,内置 voice 也走同一路径。
- **同步发现 + 缓存**:voice 文件少而小,section provider 是同步的,故 `listVoices` 同步读并缓存,坏文件跳过告警。
- **用 settings,不用 cordis config**:切换是运行时会话内动作,必须可持久化、热更新。
- **`/voice` 单层参数语法**:不搞 flag/选项,`/voice`(查看)、`/voice list`、`/voice <id>`(切换)。
- **迁移链而非一次性转换**:`version` + `MIGRATIONS` 链,为格式演进预留,坏版本 fail-loud。

## 9. 验收标准(AC)

1. 无参 `/voice` 显示当前口吻与可用列表,当前项标注 `(current)`。
2. `/voice ling` 切换后,下一次 assemble 渲染的 system prompt 含令的口吻文本。
3. `/voice 未知id` 返回 `kind: 'error'`,并列出可用 id。
4. 未知/空口吻 id 回退到默认口吻,不抛错。
5. 切换持久化到 settings 用户层,重启后仍生效。
6. `*.voice.yaml` 文件可被 `dsh-voice check` 校验,坏文件被跳过并在发现阶段告警。
7. 旧版(无 `version`)voice 文件加载时自动迁移到当前版本。
8. `create-voice` 元技能可被模型/用户调用,指导新建 voice 到 dsh 或 `.agents` 配置目录。

## 10. 非目标

- 不做「模型可切」的 `set_tone` 工具(只做人类 `/voice`)。
- 不做 Web UI、不做口吻的即时参数化生成。
- 不做独立 CLI 之外的 `dsh voice --tone …` 启动参数。
- 不进 deepseek-harness monorepo,作为社区 bundle 独立分发。

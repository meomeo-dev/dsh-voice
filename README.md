# dsh-voice

DeepSeek Harness 的「对话口吻」切换插件(bundle)。用户可随时 `/voice <id>` 切换口吻,立即生效并持久化。口吻是 `*.voice.yaml` 文件,可从内置/用户/项目三层目录发现;附带 `create-voice` 元技能与 `dsh-voice check` 校验工具。预置两个口吻:`default` 与「令 (Ling)」。

## 用法

安装到某个 profile:

```sh
dsh plugin --profile demo add dsh-voice
dsh --profile demo
```

会话内切换:

```
/voice          # 查看当前口吻与可用列表
/voice list     # 同上
/voice ling     # 切换到「令」的口吻
```

## 自带口吻

| id | label | 说明 |
|---|---|---|
| `default` | Default | 中性、直接 |
| `ling` | 令 (Ling) | 炎国诗人,古典诗词化语言,梦/醉/逍遥意象 |

## voice 文件与目录

一个口吻是一个 `*.voice.yaml` 文件:

```yaml
version: 1
id: ling          # kebab-case,须与文件名一致
label: 令 (Ling)
description: 炎国诗人
prompt: |
  <身份背景 + 说话方式 + 场景示例>
```

插件从以下目录发现(同名时后者覆盖前者):

```
内置(包内 voices/) < ~/.agents/voice < ~/.dsh/voice
  < <repo>/.agents/voice < <repo>/.dsh/voice
```

新建口吻时,写入 `~/.dsh/voice/`(dsh 配置目录)或 `<repo>/.dsh/voice/`;非 dsh 环境用 `~/.agents/voice/` 或 `<repo>/.agents/voice/`。

## create-voice 元技能

模型或用户可调用 `create-voice` 技能,按「搜集角色 → 分析说话方式 → 写口吻文本 → 落盘校验」的流程新建口吻文件。也可直接参考 [skill/create-voice/SKILL.md](skill/create-voice/SKILL.md)。

## 校验与迁移工具

```sh
dsh-voice check [dir...]     # 校验 voice 文件形状
dsh-voice migrate [dir...]   # 报告并校验到当前格式版本
```

## 开发

```sh
pnpm install
pnpm test           # vitest 单测
pnpm build          # tsc 输出 lib/
pnpm schema:gen     # 重新生成 voice.schema.yaml
```

本地联调:

```sh
dsh plugin --profile demo add .
dsh --profile demo --dump-config
dsh --profile demo
```

## 设计

详见 [docs/design.md](docs/design.md)。口吻文本来自《明日方舟》干员「令」的档案与语音台词(设定版权归原作方,此处仅作说话风格示例)。

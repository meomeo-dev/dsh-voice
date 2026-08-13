# dsh-voice

DeepSeek Harness 的「对话口吻」切换插件(bundle)。用户可随时 `/voice <id>` 切换口吻,立即生效并持久化。口吻是 `*.voice.yaml` 文件,可从内置/用户/项目三层目录发现;附带 `create-voice` 元技能与 `dsh-voice check` 校验工具。预置两个口吻:`default` 与「令 (Ling)」。

## 用法

安装到某个 profile:

```sh
dsh plugin --profile demo add @meomeo-dev/dsh-voice
dsh --profile demo
```

会话内切换:

```
/voice          # 查看当前口吻与可用列表
/voice list     # 同上
/voice ling     # 切换到「令」的口吻
```

## 安装与 prepare 说明

三种安装方式对「是否需要本地构建」的处理不同:

| 方式 | 命令 | 是否构建 |
|---|---|---|
| npm 发布包(推荐) | `dsh plugin --profile demo add @meomeo-dev/dsh-voice` | 否,发布 tarball 已含 `lib/` |
| gh/git 源码 | `dsh plugin --profile demo add github:meomeo-dev/dsh-voice#v0.1.0` | 是,拉源码后跑 `prepare` 编译 |

`prepare` 脚本(`tsc -p tsconfig.json`)的存在原因:git 安装拉的是**源码而非构建产物**,必须靠 `prepare` 把 `src/` 编译成 `lib/`,否则插件无法加载。npm 发布包则不需要——`lib/` 已在打包时构建好并随 tarball 分发。

pnpm ≥10 出于供应链安全,对 **git 依赖**默认拒绝执行 `prepare`,直到你在该 profile 的 `pnpm-workspace.yaml` 里显式放行。首次 `add github:...` 会失败并打印确切的 key,照做即可:

```yaml
allowBuilds:
  dsh-voice@https://codeload.github.com/meomeo-dev/dsh-voice/tar.gz/<sha>: true
```

该放行等于「授权该包在安装时执行任意代码」,请只对你信任的包、并 pin 到具体 tag(`#v0.1.0`)而非裸分支。若不想让用户做这一步,请用 **npm 发布包**(推荐)或 tarball 分发——二者不含源码、不触发 allowBuilds。

## 自带口吻

| id | label | 说明 |
|---|---|---|
| `default` | Default | 中性、直接 |
| `ling` | 令 (Ling) | 炎国诗人,古典诗词化语言,梦/醉/逍遥意象 |

## voice 文件与目录

一个口吻是一个 `*.voice.yaml` 文件,最终 prompt 由 Handlebars 模板从结构化字段拼接而成:

```yaml
version: 2
id: ling          # kebab-case,须与文件名一致
label: 令 (Ling)
description: 炎国诗人
identity:         # 身份背景(对象)
  role: 干员「令」(Ling)
  background: 来自大炎的诗人……
  address: 博士   # 角色对用户的称呼
style: |          # 说话方式(字符串)
  - 用古典诗词化的中文应答……
examples:         # 场景示例(数组,每个 3–5 条对话)
  - name: 场景一 · 登场接令
    turns:
      - speaker: 博士
        text: 令,帮我看看这个项目。
```

`template` 字段可用自定义 Handlebars 模板覆盖默认拼接;`voice.schema.yaml` 是格式的 JSON Schema 表达。

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
dsh-voice migrate [dir...]   # 把旧版本 voice 文件原地迁移到当前版本(写回)
```

## 发布到 npm

发布由 GitHub Actions 自动完成([`.github/workflows/release.yml`](.github/workflows/release.yml)),触发条件是「发布一个 GitHub Release」。首次使用需要一次性配置:

1. 在 npm 注册并拥有 `@meomeo-dev` 这个 scope(同名用户或 org)。
2. 在 npm 生成一个 **Automation / publish token**,复制它。
3. 在 GitHub repo 的 **Settings → Secrets and variables → Actions → New repository secret** 添加名为 `NPM_TOKEN` 的 secret,值为上一步的 token。

之后每次:**GitHub 上点 "Draft a new release" → 填 tag(如 `v0.1.1`)→ Publish release**,workflow 会自动 `install → build → 安全审计(pnpm audit) → test → npm publish`。发布前有任何一步失败(尤其安全审计)都会阻断发布。

发布成功后可安装:

```sh
dsh plugin --profile demo add @meomeo-dev/dsh-voice
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

# 通用对话风格维度参考 (General Conversation Style Dimensions)

> **name:** `style-dimensions-conversation`
> **来源 (Source):** `html_ft_llm_any_style` 的「对话风格调优器」（`ft_voice_style.html`，`dimensionsData`）。
> **同类参考:** [[style-dimensions-code]]

## 目的与边界 (Purpose & Scope)

本参考是**「抽象对话风格」的可调维度量表**（style-dimension taxonomy）。它把一段对话的「风格」拆成 **40 个 0–5 档的可调轴**（每个轴只归属一个主类别），用于标定/校准一种**通用的、非特定角色的语气基调**。

**适用范围（用，When to use）：**

- 用户要创建「通用对话风格」（general conversation style）口吻——例如「严谨极简的助手」「友好助理」「学术审稿」这类**没有指定具体角色/文风/作品**的抽象风格。
- 用户要创建「coding 对话风格」等**工作语境下的通用语气基调**——不涉及具体角色，只涉及「怎么说话」的通用倾向（代码写法本身另见 [[style-dimensions-code]]）。

**不适用范围（不用，When NOT to use）：**

- 用户要创建**特定角色**（specific character，如干员「令」）、**特定文风**（specific prose style）、**特定作品**（specific work）的口吻。此时**不得**把本量表当作「人设定义」（persona definition）套用——否则会过度命中（over-hit），产出与用户期望无关的 voice。
- 对这类特定人设，按 SKILL 第 1–2 步搜集权威档案与真实台词，再归纳风格规则。本量表仅可作**事后校准**（post-hoc calibration）：把已归纳的规则对应到这些轴，核对是否遗漏某条可观察特征。

## 量表说明 (How to read)

- 每维度 0–5 六档，0 与 5 为两端极值；默认中位为 2 或 3。
- 把分数视为「隐含强度」，写规则时转译为自然语言倾向词：几乎不 / 少量 / 适度 / 频繁 / 严格——不出现分数、id、分组标题、表格感、清单感。
- 每个维度只归属一个主类别（正交分类，orthogonal category）。

## 维度分组 (Dimension groups)

### stance — 交互立场与对齐/挑战 (Stance & Alignment / Challenge)

- **affirmation — 肯定/阿谀强度 (Affirmation / Sycophancy)**
  - 0 从不恭维，只做事实性确认
  - 1 极少恭维，仅在必要时正面确认
  - 2 中性强化，适度肯定
  - 3 偶尔中性强化
  - 4 较多使用正面夸赞
  - 5 频繁正向夸赞与迎合（如「你说得对！」默认开场）
- **pushback — 反驳/挑战力度 (Pushback / Rigor)**
  - 0 不挑战用户假设
  - 1 仅在明显矛盾时提醒
  - 2 在关键处提示并提出温和疑问
  - 3 重大问题时提醒
  - 4 主动提供对立观点
  - 5 系统性质询前提，并提供替代框架
- **compliance — 服从提示 vs 质疑提示 (Prompt Compliance vs Challenge Prompt)**
  - 0 完全服从用户框架
  - 1 轻微纠正用户误解
  - 2 温和地质疑前提并提出澄清
  - 3 发现偏差时温和纠偏
  - 4 主动重构用户需求或提出替代框架
  - 5 经常重构需求并主导对话方向
- **toneMirroring — 镜像用户语气/措辞程度 (User Tone Mirroring)**
  - 0 完全不镜像语气
  - 1 仅技术术语对齐不复制语气
  - 2 适度镜像关键用词忽略情绪
  - 3 中等镜像部分情绪与节奏
  - 4 强镜像句式与情绪高度对齐
  - 5 过度镜像，频繁复刻对方措辞与情绪
- **directness — 直接性 vs 委婉度 (Directness vs Hedging)**
  - 0 极度委婉，常用缓冲语
  - 1 比较委婉
  - 2 较为直接但保留缓冲
  - 3 直接为主，偶有缓冲
  - 4 明显直接，基本不绕弯
  - 5 直截了当，少情绪修饰

### structure — 结构与信息组织 (Structure & Information Organization)

- **verbosity — 冗长度/简洁度 (Verbosity)**
  - 0 极简要点（一句话）
  - 1 简短要点+一句说明
  - 2 精炼段落，少量展开
  - 3 简洁段落
  - 4 详细铺陈
  - 5 详细铺陈与长前言
- **structuredness — 结构化程度 (Structuredness)**
  - 0 自由叙述
  - 1 段落清晰
  - 2 轻度分点/步骤
  - 3 适度分点/步骤
  - 4 严格要点-步骤-清单
  - 5 严格要点-步骤-清单，模板化输出
- **memoryReferencing — 会话记忆引用策略 (Conversation Memory Referencing)**
  - 0 不引用前文
  - 1 仅用户提及时最小引用
  - 2 关键连续性时精炼引用一次
  - 3 主动总结前文要点承接
  - 4 结构化回顾，交叉多个历史点
  - 5 系统性线程追踪持续整合
- **clarification — 澄清提问密度 (Clarifying Questions Density)**
  - 0 少问，直接回答
  - 1 很少追问
  - 2 在明显歧义时追问
  - 3 关键歧义时追问
  - 4 倾向于提问以明确需求
  - 5 系统性提问来界定需求

### affective — 情感与语气表达 (Affective & Tone Expression)

- **empathy — 情绪共情/情感验证 (Empathy / Validation)**
  - 0 冷静中立，无情感表达
  - 1 轻微情感暗示
  - 2 温和共情
  - 3 适度共情
  - 4 明显情感认同
  - 5 明显情感认同与安抚
- **enthusiasm — 热情/能量 (Enthusiasm / Energy)**
  - 0 平实，无情绪波动
  - 1 略带积极
  - 2 积极但克制
  - 3 适度积极
  - 4 热情洋溢
  - 5 高能量、夸张兴奋（如「Heck yes!」）
- **apology — 道歉频率 (Apology Frequency)**
  - 0 仅在必要时致歉
  - 1 仅在确认错误时道歉
  - 2 必要时礼貌性道歉
  - 3 偶发礼貌性道歉
  - 4 较频繁地道歉
  - 5 频繁使用道歉作为填充话术
- **emojiFrequency — 表情符号使用频率 (Emoji Usage Frequency)**
  - 0 从不使用
  - 1 仅用户大量使用时镜像一次
  - 2 偶发单个且语义相关
  - 3 中等频率，不堆叠
  - 4 较高频，多处出现，偶有连用
  - 5 很高密度，常连用多个表情
- **hypeFiller — 炒作/营销式填充语密度 (Hype / Marketing Filler Density)**
  - 0 无任何炒作或营销腔
  - 1 极少轻度积极形容词
  - 2 低频少量增色形容不堆砌
  - 3 中等段首尾增强语气词
  - 4 高频，多处使用煽动性修饰
  - 5 过度营销腔影响客观
- **sarcasmLevel — 讽刺/不屑语气等级 (Sarcasm / Dismissiveness Level)**
  - 0 无讽刺与不屑
  - 1 极偶发、轻微揶揄暗示
  - 2 适度冷静批评质量
  - 3 直接生硬语气
  - 4 明显讽刺不屑纠偏
  - 5 高频讽刺影响礼貌
- **closingFormalities — 结束语/收尾礼节强度 (Closing Formalities / Sign-off)**
  - 0 无收尾直接结束
  - 1 长答复末尾一次中性收尾
  - 2 简短功能性收尾
  - 3 常规礼貌收尾，多数回答包含
  - 4 频繁礼貌并邀请继续互动
  - 5 冗长多层次感谢与邀请
- **praise — 赞美/表扬配额 (Praise Budget)**
  - 0 不主动表扬
  - 1 极少表扬
  - 2 有证据时适度表扬
  - 3 有证据时表扬一次
  - 4 倾向于鼓励和赞美
  - 5 频繁表扬并叠加形容词

### directive — 引导与激励/自主 (Guidance & Motivation / Autonomy)

- **ctaFrequency — 行动号召频率 (Call-To-Action Frequency)**
  - 0 禁止任何行动号召
  - 1 仅必要场景一次
  - 2 偶发单一步骤建议
  - 3 常规结尾含后续步骤
  - 4 多条行动清单含优先级
  - 5 频繁敦促执行与跟进
- **autonomyEnablement — 用户自主与自给度促进 (User Autonomy Enablement)**
  - 0 直接答案不强调自主
  - 1 答案加单一验证方法
  - 2 多路径比较鼓励选择
  - 3 引导用户推导关键一步
  - 4 教学式拆解含自测提示
  - 5 练习框架促进完全自给
- **motivationSuppression — 激励性语言抑制度 (Motivational Language Suppression)**
  - 0 完全抑制无鼓励
  - 1 极少鼓励仅成就时
  - 2 偶发中性鼓励
  - 3 适度积极强化
  - 4 高频鼓舞性词汇
  - 5 过度热血励志包装
- **proactivity — 主动性/代办倾向 (Proactivity vs Deference)**
  - 0 等待明确指令
  - 1 在简单任务上少量预判
  - 2 在范围明确时主动提出建议
  - 3 轻微前置判断
  - 4 主动提出多个方案
  - 5 主动提出方案并推进

### quality — 质量批判与请求治理 (Quality Critique & Request Governance)

- **critique — 批评直白度 (Bluntness of Critique)**
  - 0 委婉规避负面评价
  - 1 间接提出改进建议
  - 2 温和直言，尽量保留礼貌
  - 3 兼顾礼貌与直言
  - 4 直接指出问题
  - 5 直接指出「错误/不佳做法」，不加修饰
- **lowQualityDiagnostic — 低质量请求诊断深度 (Low-Quality Request Diagnostic Depth)**
  - 0 不诊断直接答
  - 1 指出单一缺失点
  - 2 列 2-3 需澄清要素与模板
  - 3 系统分解结构与缺口
  - 4 重构版本加多重方案
  - 5 全面质量审核矩阵与重写
- **qualityToneStrictness — 低质量请求语气介入强度 (Quality Tone Intervention Strictness)**
  - 0 语气完全中性不评价
  - 1 轻柔提示可改进
  - 2 直接说明问题保持礼貌
  - 3 强调改进必要语气略严肃
  - 4 严格门槛语气明显强硬
  - 5 强硬把关，要求先补全信息
- **selfCritique — 信息质量自我批判力度 (Self-Critique / Epistemic Humility)**
  - 0 不自我批判
  - 1 不确定时说可能
  - 2 关键处标注假设误差
  - 3 列替代观点与局限
  - 4 系统性风险盲点剖析
  - 5 严格置信度与弱点详述

### style — 创造与风格适配 (Creativity & Style Adaptation)

- **creativity — 创造性 vs 严谨性 (Creativity vs Precision)**
  - 0 严守既有规范，不发散
  - 1 轻度发散
  - 2 适度发散，严格对齐事实
  - 3 适度发散但对齐事实
  - 4 鼓励创造性联想
  - 5 高创造性，积极重构问题
- **persona — 个性化/人设浓度 (Persona / Quirkiness)**
  - 0 纯工具，无人设
  - 1 轻度个性化
  - 2 有稳定的人设（低存在感）
  - 3 轻度个性标签
  - 4 明显角色化
  - 5 玩梗式表达，强烈角色扮演
- **styleEmulation — 外部人格/特定风格模拟强度 (External Persona / Style Emulation)**
  - 0 不模拟外部风格
  - 1 明确要求时一次性切换
  - 2 轻度注入若干风格元素
  - 3 保持主语气可控模拟
  - 4 高度对齐特定人格特征
  - 5 深度沉浸式角色化
- **orthography — 大小写与正字法风格偏离度 (Orthography / Casing Stylization)**
  - 0 标准大小写规范
  - 1 偶发单词全大写强调
  - 2 适度非标准少量全小写
  - 3 全文统一非标准风格
  - 4 广泛大小写变化强调语气
  - 5 强烈风格化影响可读性
- **slangPuns — 缩写/俚语/双关使用度 (Abbreviations & Slang & Puns)**
  - 0 无缩写俚语双关
  - 1 极少技术缩写
  - 2 常见通用缩写无俚语
  - 3 偶发轻度俚语或双关
  - 4 多次俚语与双关风格显著
  - 5 高密度俚语双关影响清晰
- **culturalAdaptation — 文化/地域感性匹配度 (Cultural / Regional Sensibility Adaptation)**
  - 0 纯通用不调整
  - 1 明确声明时最小适配
  - 2 采用相关示例与单位
  - 3 主动使用文化惯例辅助说明
  - 4 一致嵌入文化语境线索
  - 5 高度本地化隐喻与参照

### safety — 安全与合规透明 (Safety & Compliance Transparency)

- **safety — 风险规避/安全保守度 (Safety Conservatism)**
  - 0 大胆给出建议
  - 1 附带轻微风险提示
  - 2 兼顾风险与可行性
  - 3 平衡风险与建议
  - 4 强调潜在风险并给出替代方案
  - 5 高度谨慎，倾向转介与保守建议
- **policyTransparency — 政策与限制透明度 (Policy / Limitation Transparency)**
  - 0 最少披露仅拒绝
  - 1 简短说明原因不列规则
  - 2 涉及限制概述核心政策
  - 3 主动标注政策类别与原因
  - 4 结构化列出相关政策条目
  - 5 系统性分层分析与合规替代
- **rejectionDepth — 拒绝与限制解释深度 (Rejection Explanation Depth)**
  - 0 简单拒绝无解释
  - 1 一句原因
  - 2 原因加允许范围替代
  - 3 原因加风险与替代步骤
  - 4 结构化原因风险替代
  - 5 全面政策映射多层方案

### epistemic — 技术与认知严谨度 (Technical & Epistemic Rigor)

- **uncertainty — 不确定性披露 (Uncertainty Disclosure)**
  - 0 很少表露不确定性
  - 1 暗示不确定性
  - 2 在重要点提示置信度
  - 3 在关键点提示置信度
  - 4 主动说明信息边界并标注假设
  - 5 系统性标注假设、边界与置信区间
- **evidence — 证据/引用严格度 (Evidence / Citation Strictness)**
  - 0 很少引用
  - 1 偶尔引用
  - 2 关键结论时引用
  - 3 重要结论时引用
  - 4 多数事实断言给出处
  - 5 几乎所有事实断言都给来源/链接
- **jargon — 技术深度/行话密度 (Technical Depth / Jargon)**
  - 0 面向初学者解释
  - 1 使用少量专业术语
  - 2 专业但尽量通俗
  - 3 专业但可读
  - 4 使用较多行业术语
  - 5 深度技术细节与术语密集
- **scope — 变更范围控制（面向代码）(Change Scope Control)**
  - 0 严格局部：仅执行明确指令的必要改动
  - 1 最小伴随：非指明处仅做必要的微小伴随性改动
  - 2 受控重构：在明确关联与必要性下适度重构相关模块（最小必要）
  - 3 必要延展：在充分理由支撑下做小范围伴随性改动
  - 4 收益驱动：有清晰必要性与可观改进证据时倾向较大范围优化
  - 5 论证重写：基于充分必要性与收益评估进行大幅重写/重构

### interpretation — 意图识别与澄清 (Intent Recognition & Clarification)

- **intentRecognition — 意图识别自信度 (Intent Recognition Assertiveness)**
  - 0 不主动推断用户意图，缺失时等待补充
  - 1 倾向先请求澄清后再回答
  - 2 上下文充分时直接推断，否则请求一次澄清
  - 3 多数情况下采用最高概率意图，冲突时澄清
  - 4 默认使用最高概率意图，仅极端矛盾时澄清
  - 5 始终依据最高概率意图直接回答，不追加澄清
- **intentClarification — 意图澄清循环深度 (Intent Clarification Loop Depth)**
  - 0 不追加澄清问题，直接给出答案
  - 1 仅高风险或不完整时简短澄清一次
  - 2 遇到明显歧义时提出一次澄清问题
  - 3 出现歧义会补充背景或追问一次后再答
  - 4 经常通过多轮澄清补充上下文再回答
  - 5 系统性多轮追问、整理上下文后才给答案

## 预设标定 (Presets)

预设是「常见工作语境」的成套标定，可直接作为某抽象风格的起步档，再按需微调一至两档。

| 预设 id | 名称 | 意图 | 关键轴（档位方向） |
|---|---|---|---|
| `proMinimal` | 专业极简 (Pro Minimal) | 高严谨、低情感、强直达 | pushback 4、verbosity 1、directness 4、evidence 4、critique 4、jargon 4、persona 1、praise 0、emoji 0、hypeFiller 0、motivationSuppression 4、sarcasm 0 |
| `friendlyAssistant` | 友好助理 (Friendly Assistant) | 高亲和、适度结构、温和纠偏 | empathy 4、enthusiasm 3、apology 3、persona 3、praise 3、emoji 3、toneMirroring 4、closingFormalities 4、sarcasm 1 |
| `academicReview` | 学术审稿 (Academic Review) | 强质检、强证据、克制情感 | pushback 5、evidence 5、critique 5、clarification 5、jargon 4、structuredness 4、policyTransparency 4、lowQualityDiagnostic 5、intentClarification 5、affirmation 0、praise 0、emoji 0 |
| `professionalPersona` | 专业 (Professional) | 客观、克制的专业助理 | directness 4、evidence 4、jargon 4、structuredness 4、persona 1、emoji 0、hypeFiller 0、motivationSuppression 4 |
| `efficientPersona` | 高效 (Efficient) | 极简、目的导向、少废话 | verbosity 1、directness 5、critique 4、scope 0、emoji 0、motivationSuppression 5、intentRecognition 5、intentClarification 1 |
| `friendlyPersona` | 友好 (Friendly) | 高亲和、积极、礼貌收尾 | affirmation 3、empathy 4、enthusiasm 4、praise 4、compliance 4、toneMirroring 4、closingFormalities 4 |
| `candidPersona` | 直率 (Candid) | 直言不讳、批评直接 | pushback 4、directness 5、critique 5、persona 2、sarcasm 1 |
| `quirkyPersona` | 好玩 (Quirky) | 高能量、强个性化、多俚语双关 | enthusiasm 5、creativity 5、persona 5、praise 4、slangPuns 4、orthography 2、styleEmulation 3 |
| `nerdyPersona` | 技术向 (Nerdy) | 术语密集、严谨、重证据 | verbosity 4、uncertainty 4、evidence 4、jargon 5、structuredness 4、clarification 4、safety 4 |
| `cynicalPersona` | 怀疑 (Cynical) | 系统性质疑、少赞美 | affirmation 0、pushback 5、directness 5、critique 5、sarcasm 2、clarification 4 |

## 附加硬规则提示词 (Extra hard-rule prompts)

这些是量表的「硬约束」补充，对应到某条轴的可选极端档；可直接转写成 `style:` 字段里「禁止 X / 消除 Y」式的硬规则。

| 维度 | 附加 id | 原文 (text) | 中译 (trans_chi) |
|---|---|---|---|
| affirmation | `avoid_syco` | Avoid sycophancy; no generic agreements like “你说得对”. | 避免阿谀；不要使用「你说得对」等通用性认同。 |
| affirmation | `anti_syco_objective` | Maintain strictly objective, analytical tone; no motivational or flattering language; avoid rhetorical flourishes. | 严格保持客观、分析性的语气；避免励志或奉承语言；不使用修辞性辞藻。 |
| pushback | `assumption_check` | List 1–3 key assumptions and challenge them. | 列出 1–3 个关键假设并提出挑战。 |
| motivationSuppression | `no_hype` | Suppress motivational or hype filler completely. | 完全抑制鼓动式/炒作式语言。 |
| motivationSuppression | `absolute_mode_suppress` | Absolute mode: disable engagement boosters; no emojis/filler/hype; no questions/offers/suggestions; end immediately after info. | 绝对模式：禁用提升参与度的措辞；不用表情/填充/炒作；不提问题/建议/邀请；提供信息后立即结束。 |
| emojiFrequency | `eliminate_emojis` | Eliminate emojis completely. | 完全不使用表情符号。 |
| hypeFiller | `eliminate_hype_filler` | Eliminate hype, filler, and marketing phrasing. | 去除炒作、填充和营销式措辞。 |
| ctaFrequency | `ban_call_to_action` | Do not offer any calls to action. | 不要提供任何行动号召。 |
| toneMirroring | `never_mirror` | Never mirror user’s diction, mood, or affect. | 不要镜像用户的用词、情绪或语气。 |
| closingFormalities | `no_closure` | No closings or sign-offs; terminate after delivering info. | 不添加结束语或署名；提供完信息即结束。 |
| memoryReferencing | `no_memory` | Do not reference prior memory or records. | 不要引用先前的记忆或记录。 |
| directness | `efficient_style` | Efficient style: concise when appropriate, more when necessary; avoid cliches and fluff. | 高效风格：该简则简，该详则详；避免陈词滥调与废话。 |
| directness | `blunt_priority` | Prioritize blunt, directive phrasing over tone-matching. | 优先使用直截了当的指令式表述，而非语气匹配。 |
| jargon | `plain_language` | Prefer plain language; replace jargon with clear phrasing. | 优先通俗语言；用清晰表述替代行话。 |
| structuredness | `compactness_rules` | Enforce compact answers; avoid long prefaces; minimal code snippets and no large dumps. | 强制紧凑回答；避免冗长前言；代码片段最少且不做大段输出。 |
| verbosity | `crisp_by_default` | Default to crisp, purpose-driven replies; trim anything not moving work forward. | 默认简洁、目标导向的回答；删除一切无助推进的内容。 |
| critique | `no_empty_praise` | Avoid empty praise; focus on actionable critique. | 避免空洞夸赞；聚焦可执行的改进意见。 |
| critique | `severity_tags` | Tag issues with severity: [Minor\|Major\|Critical]. | 给问题加严重程度标签：[Minor\|Major\|Critical]。 |
| evidence | `add_sources` | Append 2–4 authoritative sources (APA short form). | 在末尾附上 2–4 个权威来源（APA 简短格式）。 |
| evidence | `mark_uncertain` | Mark any uncertain claim with (?) suffix. | 对不确定的断言添加 (?) 标记。 |
| scope | `limit_refactor` | Do not refactor beyond explicitly instructed regions. | 不要在明确指示区域之外进行重构。 |

## 如何转译为 style 规则 (Converting to style rules)

把选定的轴与档位转写成 `*.voice.yaml` 的 `style:` 字段里的自然语言规则时：

1. **删掉量表外壳**：不出现分数、id、分组标题、表格感、清单感。
2. **分数 → 倾向词**：把分数当「隐含强度」，转译为「几乎不 / 少量 / 适度 / 频繁 / 严格」。
3. **可执行、可观察**：每条规则写出「句法节奏、重复意象、语域、称呼」这类具体特征，而非空洞形容词。
4. **硬约束收尾**：口吻要传神，但技术结论必须准确、可执行，不得因文害意。

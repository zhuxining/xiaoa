# Agent 工作区架构设计

## 1. 产品概述

小A是一个面向非 Coding 群体的 Agent 工作站。用户可以创建**工作区**来定义一个 Agent，为其配置技能、记忆与知识库，然后在工作区内打开**项目**（本地文件夹）来开展多个对话处理工作。

### 1.1 核心概念

```text
小A（应用架构）
├── 全局设置 (GlobalConfig)  # LLM 密钥、主题、语言、默认模型
├── 内置小A Agent            # 开箱即用的通用助手
│   ├── 会话 (Sessions)
│   └── 记忆 (Memories)
└── 工作区 (Workspace)
    ├── Agent 配置
    ├── 技能 (Skills)
    ├── 记忆 (Memories)
    ├── 知识库 (Knowledge)
    └── 项目 (Projects)
        └── 会话 (Sessions)
```

### 1.2 用户画像

- 非技术用户（写作者、研究员、运营、产品经理等）
- 需要 AI 辅助处理本地文件（文档整理、内容生成、信息提取）
- 不了解也不需要了解 MCP、API 等技术概念

---

## 2. 信息架构

### 2.1 领域模型关系

```text
GlobalConfig 1:1 应用
Workspace 1:1 Agent
Workspace 1:N Project
Workspace 1:N Skill
Workspace 1:N Memory
Workspace 1:N Knowledge
Project    1:N Session
Session    1:N Message
```

### 2.2 实体定义

| 实体 | 说明 | 关键属性 |
| ----- | ---- | ---------- |
| **GlobalConfig** | 应用级全局配置（独立于工作区） | activeWorkspaceId, llm, preferences, memoryLimit |
| **Workspace** | 顶层容器，定义一个完整的 Agent 工作环境 | id, name, agentConfig, createdAt |
| **Agent** | 工作区的 AI 助手配置（内嵌于 Workspace） | name, avatar, systemPrompt, model, temperature |
| **Skill** | 遵循 Agent Skills 标准的指令包，含 SKILL.md 入口 + 参考资料 | name, description, icon, instructions, references/ |
| **Memory** | 持久化上下文（用户手动或 Agent 自动总结），支持自动清理 | id, category, origin, priority, refs, content |
| **Knowledge** | 知识库条目，含 description 摘要供 Agent 按需检索 | id, name, description, source, status, parsedFile |
| **Project** | 打开的本地文件夹 | id, name, path, workspaceId |
| **Session** | 一次对话 | id, title, projectId, createdAt, updatedAt |
| **Message** | 对话中的单条消息 | id, role, content, sessionId, timestamp |

---

## 3. UI 布局设计

### 3.1 整体布局结构

```text
┌─────────────────────────────────────────────────────────────────┐
│  [-] [□] [×]              小A                         (拖拽区)  │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  左侧栏   │                   主内容区                           │
│  (固定)   │                  (动态切换)                          │
│          │                                                      │
├──────────┤                                                      │
│ ┌──────┐ │                                                      │
│ │工作区 │ │                                                      │
│ │切换器 │ │                                                      │
│ ├──────┤ │                                                      │
│ │Agent │ │                                                      │
│ │技能  │ │                                                      │
│ │记忆  │ │                                                      │
│ │知识库│ │                                                      │
│ ├──────┤ │                                                      │
│ │      │ │                                                      │
│ │项目  │ │                                                      │
│ │列表  │ │                                                      │
│ │      │ │                                                      │
│ │ [+]  │ │                                                      │
│ └──────┘ │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### 3.2 左侧栏详细设计

左侧栏宽度固定（约 200px），自上而下分为四个区域：小A入口、工作区配置区、项目列表区、设置入口

```text
┌────────────────────┐
│ 🐣 小A              │
├────────────────────┤
│ 📎 工作区名称   ▾   │
├────────────────────┤
│ 🤖 Agent           │
│ ⚡ 技能             │
│ 🧠 记忆             │
│ 📚 知识库           │
├────────────────────┤
│ 📁 项目 A          │
│ 📁 项目 B          │
│ 📁 项目 C          │
│                    │
│ [+ 打开文件夹]     │
├────────────────────┤
│ ⚙️ 设置             │
└────────────────────┘
```

**交互规则**：

- "小A"、配置项、项目和设置共享同一个选中态（同一时刻只有一个选中项）
- 选中项决定主内容区显示什么
- 点击"小A" → 主内容区显示小A的对话视图（无项目上下文，纯对话）
- 点击工作区配置项 → 显示对应配置页
- 点击项目 → 显示项目工作视图
- 工作区切换器支持搜索、新建、重命名、删除

### 3.3 主内容区 — 配置页面

点击左侧栏的 Agent / 技能 / 记忆 / 知识库时，主内容区整体替换为对应配置页：

#### Agent 配置页

```text
┌────────────────────────────────────────────────┐
│  Agent 配置                                     │
├────────────────────────────────────────────────┤
│                                                 │
│  头像     [选择图片]                             │
│  名称     [__________________________]          │
│  人设     [                          ]          │
│           [    多行文本编辑器         ]          │
│           [__________________________]          │
│  模型     [Claude Sonnet  ▾]                    │
│                                                 │
└────────────────────────────────────────────────┘
```

#### 技能管理页

技能遵循 [Agent Skills](https://agentskills.io/) 开放标准。每个技能是一个目录，包含 `SKILL.md` 入口文件（YAML frontmatter + Markdown 指令正文）和可选的参考资料。GUI 提供可视化编辑器，底层生成标准格式文件。

**磁盘格式示例**：

```yaml
# skills/rewrite/SKILL.md
---
name: rewrite
description: 调整文本风格和语气，支持正式、口语、学术等多种风格
icon: ✏️
argument-hint: "[风格] [文本]"
---

你是一位专业的文本编辑。请根据用户指定的风格改写以下内容。

## 参数
- 风格: $0（正式 / 口语 / 学术 / 简洁）
- 内容: 后续所有文本

## 规则
- 保留原文核心含义
- 适配目标风格的用词和句式
- 保持段落结构
```

**GUI 编辑视图**：

```text
┌────────────────────────────────────────────────┐
│  技能                    [导入技能] [+ 新建技能] │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ ✏️ 改写    调整文本风格和语气              │  │
│  │ 📝 摘要    提取文档核心要点               │  │
│  │ 🌐 翻译    在中英文之间翻译               │  │
│  │ 📊 分析    分析数据并生成报告             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ── 选中技能的编辑区域 ──                        │
│  名称       [rewrite_______________]            │
│  图标       [✏️ ▾]                              │
│  描述       [调整文本风格和语气_____]            │
│  参数提示   [[风格] [文本]__________]            │
│  调用方式   [●用户+自动  ○仅用户  ○仅自动]      │
│  指令正文   [                          ]        │
│             [  你是一位专业的文本编辑.. ]        │
│             [  请根据用户指定的风格改.. ]        │
│             [__________________________]        │
│  参考资料   [📄 风格指南.md          ]          │
│             [+ 添加参考文件]                     │
│                                                 │
└────────────────────────────────────────────────┘
```

**调用方式说明**：

- **用户+自动**（默认）：用户可通过 `/技能名` 调用，Agent 也会根据描述自动匹配调用
- **仅用户**：仅用户手动调用（`disable-model-invocation: true`）
- **仅自动**：不出现在 `/` 菜单，仅 Agent 自动调用（`user-invocable: false`）

**对话中使用技能**：

- 输入框中键入 `/` 弹出技能快捷菜单，选择后自动填充技能名
- 如技能定义了 `argument-hint`，输入框会显示参数占位提示
- Agent 根据技能的 `description` 自动判断何时调用（渐进式加载：元数据常驻 → 指令按需加载 → 参考资料按需读取）

#### 记忆管理页

```text
┌────────────────────────────────────────────────┐
│  记忆                              [+ 添加记忆] │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ 偏好  │ 用户偏好中文回复，正式语气        │  │
│  │ 领域  │ 用户从事教育行业，关注 K12        │  │
│  │ 习惯  │ 文档格式偏好 Markdown             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ── 编辑区域 ──                                  │
│  分类     [偏好______]                          │
│  内容     [                          ]          │
│           [    多行文本编辑器         ]          │
│           [__________________________]          │
│                                                 │
└────────────────────────────────────────────────┘
```

#### 知识库管理页

导入的文件/URL 会由后台任务自动解析为 Markdown，Agent 对话时直接读取解析后的内容。

```text
┌────────────────────────────────────────────────┐
│  知识库                            [+ 添加知识] │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ 📄 产品需求文档.pdf     ● 已就绪          │  │
│  │ 📄 竞品分析.docx        ◌ 解析中...       │  │
│  │ 📄 设计规范.md          ● 已就绪          │  │
│  │ 🔗 API 文档             ● 已就绪          │  │
│  │ 📄 损坏文件.xyz         ✕ 解析失败        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ── 选中条目详情 ──                              │
│  来源     📄 产品需求文档.pdf (2.3 MB)          │
│  状态     ● 已就绪                               │
│  解析时间  2025-01-15 14:30                      │
│  [预览解析结果]  [重新解析]  [删除]               │
│                                                 │
│  支持拖入本地文件或粘贴在线链接                   │
│  支持格式：PDF、Word、HTML、TXT、Markdown、图片   │
│                                                 │
└────────────────────────────────────────────────┘
```

**解析流程**：

1. 用户拖入文件或粘贴 URL → 创建 Knowledge 条目（`status: "pending"`）
2. Main 进程启动后台解析任务 → 状态变为 `"parsing"`，UI 显示进度
3. 解析完成 → 生成 `knowledge/{id}.md`，状态变为 `"ready"`
4. 解析失败 → 状态变为 `"error"`，显示错误原因，支持重新解析

**支持的解析类型**：

| 来源类型 | 解析方式 |
| -------- | --------- |
| PDF | 文本提取 + 结构化为 Markdown 标题/段落 |
| Word (.docx) | 转换为 Markdown（保留标题层级、列表、表格） |
| HTML / URL | 抓取页面 → 提取正文 → 转为 Markdown |
| 纯文本 / Markdown | 直接复制（无需解析） |
| 图片 | OCR 识别 → 转为 Markdown 文本 |

### 3.4 主内容区 — 小A对话视图

点击左侧栏顶部的"小A"时，主内容区显示小A的对话界面。小A是内置全局 Agent，开箱即用，无需创建工作区：

```text
┌──────────────────────────────────────────────────┐
│                                                   │
│                   小A 对话视图                     │
│                                                   │
│  ┌─ 会话列表 ──┬─ 对话区 ─────────────────────┐   │
│  │             │                               │   │
│  │ 💬 今天的..  │  🐣 你好！我是小A，有什么...  │   │
│  │ 💬 上次的..  │                               │   │
│  │             │  👤 帮我总结一下这个文件       │   │
│  │             │  📎 report.pdf                │   │
│  │             │                               │   │
│  │ [+ 新会话]  │  🐣 好的，这份报告主要...     │   │
│  │             ├───────────────────────────────┤   │
│  │             │ [📎 附件] [输入消息...]  [发送] │   │
│  └─────────────┴───────────────────────────────┘   │
│                                                   │
└──────────────────────────────────────────────────┘
```

**特点**：

- **开箱即用**：用户首次打开应用即可直接对话，无需创建工作区
- **通用助手**：无特定领域人设，适合通用问答、文件处理、临时任务
- 支持通过附件按钮上传文件（不需要打开项目）
- 有独立的会话列表（存储于 `~/.xiaoa/xiaoa/sessions/`）
- 使用全局默认模型（不可在小A层面自定义模型，需去设置页修改）
- 有独立的记忆（存储于 `~/.xiaoa/xiaoa/memories/`）
- 复用现有的 Session/Message 类型，`activeWorkspaceId = null` 时表示当前在小A模式
- 默认使用 Review 权限模式

**内置 System Prompt**（固定，不可编辑）：

```markdown
你是小A，一个友好的AI助手。你擅长帮助用户处理各种日常任务，
包括文件整理、文本编写、信息查询和问题解答。

## 行为准则
- 使用简洁、友好的中文回复
- 主动询问不明确的需求
- 对于复杂任务，先确认用户意图再执行
```

### 3.5 主内容区 — 设置页面

点击左侧栏底部的"设置"时，主内容区显示全局设置页：

```text
┌────────────────────────────────────────────────┐
│  设置                                           │
├────────────────────────────────────────────────┤
│                                                 │
│  ── LLM 服务 ──                                 │
│  服务商   [Anthropic ▾]                         │
│  API Key  [••••••••••••]  [测试连接]             │
│  默认模型  [Claude Sonnet 4.5 ▾]                │
│                                                 │
│  ── 外观 ──                                     │
│  主题     [● 跟随系统  ○ 浅色  ○ 深色]           │
│  语言     [简体中文 ▾]                           │
│                                                 │
│  ── 记忆管理 ──                                  │
│  自动清理阈值  [5000] 字                         │
│                                                 │
│  ── 关于 ──                                     │
│  版本     v0.1.0                                │
│                                                 │
└────────────────────────────────────────────────┘
```

**配置层级（全局 → 工作区覆盖）**：

```text
GlobalConfig.llm.model = "claude-sonnet-4-5"     ← 全局默认
    ↓ 工作区可覆盖
Workspace.agent.model = "claude-opus-4-6"         ← 优先使用

GlobalConfig.memoryLimit = 5000                    ← 全局默认
    ↓ 工作区可覆盖
Workspace.memoryLimit = 3000                       ← 优先使用
```

### 3.6 主内容区 — 项目工作视图

点击左侧栏的某个项目时，主内容区显示该项目的工作视图，分为三栏：

```text
┌──────────────────┬──────────────────────────────┐
│                  │                               │
│  文件浏览器       │        操作区                  │
│  (树形目录)      │                               │
│                  │   ┌───────────────────────┐   │
│  📁 src/         │   │                       │   │
│    📄 index.ts   │   │    对话视图            │   │
│    📄 utils.ts   │   │    或                  │   │
│  📁 docs/        │   │    文件预览            │   │
│    📄 readme.md  │   │                       │   │
│                  │   │                       │   │
├──────────────────┤   │                       │   │
│                  │   │                       │   │
│  会话列表         │   │                       │   │
│                  │   │                       │   │
│  💬 文档整理任务   │   ├───────────────────────┤   │
│  💬 翻译项目文档   │   │ ┌─────────────────┐   │   │
│  💬 数据分析报告   │   │ │  输入框 / 技能栏  │   │   │
│                  │   │ └─────────────────┘   │   │
│  [+ 新建会话]    │   └───────────────────────┘   │
│                  │                               │
└──────────────────┴──────────────────────────────┘
     中间栏 (~240px)         右侧操作区 (flex-1)
```

**中间栏**由上下两部分组成：

- **上：文件浏览器** — 显示项目文件夹的树形目录，支持展开/折叠子文件夹
- **下：会话列表** — 该项目下的所有对话，按时间排序

**右侧操作区**根据用户操作动态显示：

- 选中会话 → 显示**对话视图**（消息列表 + 输入框 + 技能快捷栏）
- 点击文件 → 显示**文件预览**（文本/图片/PDF 预览）
- 对话中可通过 `@` 引用文件浏览器中的文件作为上下文

### 3.7 完整布局组合

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  [-] [□] [×]                    小A                          (拖拽区)  │
├──────────┬───────────────────────────────────────────────────────────────┤
│ 🐣 小A    │                                                              │
├──────────┤               主内容区 (动态切换)                              │
│ 工作区 ▾  │                                                              │
├──────────┤   选中小A     → 显示小A对话视图                                │
│ Agent    │   选中配置项 → 显示配置页（全屏）                               │
│ 技能     │   选中项目   → 显示项目工作视图（文件+会话+操作区）              │
│ 记忆     │   选中设置   → 显示全局设置页                                  │
│ 知识库   │                                                              │
├──────────┤                                                              │
│ 项目 A ● │                                                              │
│ 项目 B   │                                                              │
│ 项目 C   │                                                              │
│          │                                                              │
│ [+]      │                                                              │
├──────────┤                                                              │
│ ⚙️ 设置   │                                                              │
└──────────┴───────────────────────────────────────────────────────────────┘
  ~200px                            flex-1
```

---

## 4. 数据模型

### 4.1 类型定义（@xiaoa/types）

```typescript
// ============================================
// GlobalConfig — 应用级全局配置
// 存储于 ~/.xiaoa/config.json
// ============================================

interface GlobalConfig {
  activeWorkspaceId: string | null;       // 当前活跃工作区（null = 使用内置小A）
  llm: LLMConfig;                         // LLM 服务配置
  preferences: AppPreferences;            // 应用偏好
  memoryLimit: number;                    // 记忆自动清理字数阈值（全局默认，工作区可覆盖）
}

interface LLMConfig {
  provider: "anthropic" | "openai" | "openrouter" | "ollama" | "custom";
  apiKey?: string;                        // 加密存储于 credentials.enc
  model: string;                          // 默认模型（工作区可覆盖）
  endpoint?: string;                      // 自定义端点（ollama/custom 时使用）
}

interface AppPreferences {
  theme: "light" | "dark" | "system";     // 主题
  language: string;                       // 界面语言，默认 "zh-CN"
}

// ============================================
// Workspace
// ============================================

interface Workspace {
  id: string;
  name: string;
  agent: AgentConfig;
  permissions: WorkspacePermissions;   // 权限配置（定义见 Section 5.5）
  createdAt: number;
  updatedAt: number;
}

interface AgentConfig {
  name: string;
  avatar?: string;           // 头像路径或内置标识
  systemPrompt: string;      // 人设指令
  model: string;             // 模型标识
  temperature?: number;
}

// ============================================
// Skill — 遵循 Agent Skills 开放标准
// 磁盘格式: {skill-name}/SKILL.md (YAML frontmatter + Markdown body)
// 以下接口是 SKILL.md 解析后的结构化表示，供 GUI 和 IPC 使用
// ============================================

/** 技能调用方式 */
type SkillInvocation = "both" | "user-only" | "model-only";

interface Skill {
  name: string;                    // 技能标识符（小写字母+数字+连字符，同时作为目录名）
  workspaceId: string;
  description: string;             // 功能描述，Agent 据此自动判断何时调用
  icon?: string;                   // emoji 图标（扩展字段，存于 frontmatter）
  argumentHint?: string;           // 参数提示，如 "[风格] [文本]"
  invocation: SkillInvocation;     // 调用方式（映射 disable-model-invocation / user-invocable）
  instructions: string;            // Markdown 格式的指令正文，支持 $ARGUMENTS / $0 $1 插值
  references?: SkillReference[];   // 技能目录下的参考资料文件列表
}

interface SkillReference {
  name: string;                    // 文件名
  path: string;                    // 相对于技能目录的路径（references/xxx.md）
}

// ============================================
// Memory — 持久化上下文
// 磁盘格式: memories/{id}.md (YAML frontmatter + Markdown body)
// 支持自动清理：当总字数超过阈值时，根据引用次数/重要性/时间自动淘汰
// ============================================

/** 记忆来源 */
type MemoryOrigin = "user" | "auto";

/** 重要性等级 */
type MemoryPriority = "low" | "normal" | "high" | "pinned";

interface Memory {
  id: string;
  workspaceId: string;
  category: string;              // 分类标签（偏好、领域、习惯、经验教训等）
  origin: MemoryOrigin;          // 来源：用户手动添加 or Agent 自动总结
  priority: MemoryPriority;      // 重要性（pinned 永不自动清理）
  refs: number;                  // 被 Agent 引用的次数（对话中实际使用时递增）
  content: string;               // Markdown 正文（运行时从 .md body 读取）
  createdAt: number;
  updatedAt: number;
  lastReferencedAt?: number;     // 最近一次被 Agent 引用的时间
}

// ============================================
// Knowledge — 知识库（区别于 Skill 内部的 references）
// 用户导入原始文件/URL 后，后台任务自动解析为 Markdown，供 Agent 直接消费
// ============================================

type KnowledgeSource = "local" | "url";

/** 解析状态 */
type KnowledgeStatus = "pending" | "parsing" | "ready" | "error";

interface Knowledge {
  id: string;
  workspaceId: string;
  name: string;                    // 显示名称
  description: string;             // 内容摘要，存于解析后 .md 的 frontmatter，供 Agent L0 判断是否需要读取全文
  source: KnowledgeSource;
  originalPath?: string;           // source=local 时的原始文件路径
  originalUrl?: string;            // source=url 时的原始链接
  mimeType?: string;               // 原始文件 MIME 类型（pdf, docx, html 等）
  parsedFile: string;              // 解析后的 Markdown 文件路径（相对于 knowledge/ 目录）
  status: KnowledgeStatus;         // 解析状态
  error?: string;                  // status=error 时的错误信息
  addedAt: number;
  parsedAt?: number;               // 解析完成时间
}

// ============================================
// Project — 本地文件夹项目
// ============================================

interface Project {
  id: string;
  workspaceId: string;
  name: string;              // 文件夹名称
  path: string;              // 绝对路径
}

// ============================================
// Session — 对话
// ============================================

interface Session {
  id: string;
  projectId: string | null;      // null = 小A全局会话
  title: string;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Message — 消息
// ============================================

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];  // 引用的文件
  timestamp: number;
}

interface Attachment {
  name: string;
  path: string;               // 文件路径
  mimeType?: string;
}
```

### 4.2 本地存储结构

```text
~/.xiaoa/
├── config.json                    # GlobalConfig（活跃工作区 ID、LLM 配置、偏好等）
├── credentials.enc                # 加密的 API 密钥（AES-256-GCM）
├── xiaoa/                         # 内置小A Agent 的数据目录（结构同工作区，但无 workspace.json）
│   ├── memories/
│   │   ├── index.json
│   │   └── {id}.md
│   └── sessions/
│       └── {session-id}.jsonl
└── workspaces/
    └── {workspace-id}/
        ├── workspace.json         # Workspace + AgentConfig
        ├── skills/                # 技能目录（Agent Skills 标准格式）
        │   ├── rewrite/
        │   │   ├── SKILL.md       # 入口文件（YAML frontmatter + Markdown）
        │   │   └── references/    # 可选：技能专属参考资料
        │   │       └── style-guide.md
        │   ├── summarize/
        │   │   └── SKILL.md
        │   └── translate/
        │       └── SKILL.md
        ├── memories/              # 记忆（每条一个 .md，支持自动清理）
        │   ├── index.json         # 索引：[{id, category, origin, priority, refs, timestamps}]
        │   └── {id}.md            # frontmatter(category/origin/priority) + 正文
        ├── knowledge/             # 知识库（索引 + 解析后的 Markdown）
        │   ├── index.json         # 索引：[{id, name, description, source, status, ...}]
        │   └── {id}.md            # frontmatter(name/description) + 解析后的正文
        ├── projects.json          # Project[]（路径索引）
        └── sessions/
            └── {session-id}.jsonl # 单个会话的消息流（逐行 JSON）
```

**设计决策**：

- **技能采用目录格式**（Agent Skills 开放标准），每个技能是独立目录，包含 `SKILL.md` 入口文件和可选的 `references/` 子目录。好处：可导入/导出/分享整个技能目录，与生态兼容
- **知识库解析后的 `.md` 文件含 frontmatter**（`name` + `description`），`description` 在解析时由 LLM 自动生成摘要。Agent 在 L0 层仅加载 `name + description` 列表，按需读取全文
- **记忆采用 index.json + 独立 .md 模式**，每条记忆的元数据（`priority`、`refs`、`origin` 等）存于 index.json，内容存为独立 `.md` 文件（含 frontmatter）。支持用户手动添加和 Agent 自动总结两种来源
- **记忆自动清理**：当记忆总字数超过配置阈值时，触发清理任务。清理评分公式综合考虑：引用频次（`refs`）、最近引用时间（`lastReferencedAt`）、创建时间（`createdAt`）、重要性（`priority`）。`priority: "pinned"` 的记忆永不自动清理
- 会话消息使用 JSONL 格式（参考 craft-agents），支持追加写入，避免大文件重写
- 工作区配置使用 JSON 文件，结构清晰，方便人工检查
- 每个工作区完全隔离，删除工作区只需删除整个目录

**记忆 `.md` 文件格式示例**：

```yaml
# memories/{id}.md
---
category: 经验教训
origin: auto
priority: normal
---

用户在处理 PDF 批量翻译任务时发现，先提取目录结构再逐章翻译的效果远优于全文直译。
应优先识别文档结构，保持章节编号一致性。
```

**知识库 `.md` 文件格式示例**：

```yaml
# knowledge/{id}.md
---
name: 产品需求文档
description: 小A桌面应用的产品需求规格，包含功能列表、用户故事、验收标准和优先级排序
---

# 产品需求文档 v2.1
## 1. 项目背景
...（解析后的完整 Markdown 内容）
```

**记忆清理评分算法**：

```text
score = w1 × normalize(refs)
      + w2 × normalize(daysSinceLastRef, inverse)
      + w3 × normalize(daysSinceCreated, inverse)
      + w4 × priorityWeight

其中 priorityWeight: pinned=∞, high=3, normal=1, low=0.3
清理时按 score 升序排列，从最低分开始删除直到总字数低于阈值
```

---

## 5. 权限模型（Permissions）

参考 [craft-agents-oss](https://github.com/lukilabs/craft-agents-oss.git) 的三级权限设计，适配小A的非技术用户场景。

### 5.1 权限等级

```text
┌─────────────────────────────────────────────────────────────────┐
│  浏览模式 (Explore)        审核模式 (Review)       自动模式 (Auto)  │
│  ────────────────         ────────────────        ──────────────  │
│  Agent 只能读取            Agent 操作前需确认       Agent 全自动执行  │
│  安全零风险                用户逐项审批             完全信任 Agent    │
│                                                                   │
│  ● 灰色徽标                ● 琥珀色徽标             ● 紫色徽标      │
│  适合：初次探索文件         适合：日常使用           适合：批量任务    │
└─────────────────────────────────────────────────────────────────┘
```

| 权限等级 | 文件读取 | 文件写入 | 文件删除/移动 | 记忆写入 | 知识库管理 | 技能执行 |
| --------- | -------- | -------- | ------------- | -------- | ----------- | -------- |
| **浏览** (Explore) | ✅ 允许 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 |
| **审核** (Review) | ✅ 允许 | ⚠️ 需确认 | ⚠️ 需确认 | ⚠️ 需确认 | ⚠️ 需确认 | ✅ 允许 |
| **自动** (Auto) | ✅ 允许 | ✅ 允许 | ✅ 允许 | ✅ 允许 | ✅ 允许 | ✅ 允许 |

### 5.2 操作分类

Agent 的所有操作按风险等级分为三类：

```typescript
// ============================================
// Permissions — 权限模型
// ============================================

/** 权限等级 */
type PermissionMode = "explore" | "review" | "auto";

/** 操作风险等级 */
type ActionRisk = "safe" | "moderate" | "dangerous";

/**
 * 操作分类与风险映射
 *
 * safe（安全）— 任何模式都允许，无需确认
 *   - 读取文件内容
 *   - 浏览目录树
 *   - 读取知识库/记忆内容
 *   - 预览文件
 *
 * moderate（中等）— Review 模式需确认，Auto 模式自动通过
 *   - 创建/修改文件
 *   - 添加/编辑记忆
 *   - 添加知识库条目
 *   - 执行技能指令
 *
 * dangerous（危险）— Review 和 Auto 模式都需确认（可配置 Auto 跳过）
 *   - 删除文件
 *   - 移动/重命名文件
 *   - 批量文件操作
 *   - 删除记忆/知识库条目
 *   - 清理记忆（自动清理不受此限制，走独立策略）
 */
```

### 5.3 权限判定流程

```text
Agent 请求执行操作
    │
    ▼
┌─────────────┐
│ 判断操作风险  │
│ safe/moderate│
│ /dangerous   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ 当前权限模式？                                 │
├──────────┬──────────────┬────────────────────┤
│ Explore  │   Review     │     Auto           │
├──────────┼──────────────┼────────────────────┤
│ safe:    │ safe:        │ safe:              │
│  ✅ 通过  │  ✅ 通过      │  ✅ 通过            │
│ moderate:│ moderate:    │ moderate:          │
│  ❌ 拒绝  │  ⚠️ 弹确认框  │  ✅ 自动通过        │
│ dangerous│ dangerous:   │ dangerous:         │
│  ❌ 拒绝  │  ⚠️ 弹确认框  │  ⚠️ 弹确认框(可关)  │
└──────────┴──────────────┴────────────────────┘
```

### 5.4 确认交互设计

当操作需要用户确认时，在对话区底部弹出确认栏：

```text
┌──────────────────────────────────────────────────────┐
│  🔒 Agent 请求执行以下操作：                           │
│                                                       │
│  📝 修改文件: docs/报告.md                             │
│  变更预览: 替换第 15-20 行（+3 行 / -2 行）             │
│                                                       │
│  [允许]  [本次会话始终允许此类操作]  [拒绝]              │
└──────────────────────────────────────────────────────┘
```

**确认选项**：

- **允许** — 仅本次操作通过
- **本次会话始终允许此类操作** — 会话内同类操作不再提示（会话结束后重置）
- **拒绝** — 阻止操作，Agent 收到拒绝反馈后调整策略

### 5.5 权限配置

权限模式存储于 Workspace 级别，默认 Review 模式：

```typescript
interface WorkspacePermissions {
  mode: PermissionMode;                // 当前权限模式，默认 "review"
  dangerousAutoConfirm: boolean;       // Auto 模式下 dangerous 操作是否跳过确认，默认 false
  allowedWritePaths?: string[];        // 额外允许写入的路径（glob 模式），Explore 模式下也生效
}
```

**内置小A的权限**：

小A 默认使用 Review 模式，不可由用户切换（因为小A无项目上下文，主要操作为对话和文件附件处理）。

**UI 切换方式**：

- 对话区右上角显示当前模式徽标（灰/琥珀/紫）
- 点击徽标弹出下拉切换
- 快捷键 `Shift+Tab` 循环切换

### 5.6 权限作用域

```text
┌─────────────────────────────────┐
│ Workspace 级别                    │
│  └ permissions.mode              │ ← 全局默认模式
│  └ permissions.allowedWritePaths │ ← 全局白名单
├─────────────────────────────────┤
│ Session 级别                      │
│  └ sessionWhitelist[]            │ ← 会话内"始终允许"的操作类型
│  └ 会话结束时自动清空              │   （仅运行时状态，不持久化）
└─────────────────────────────────┘
```

### 5.7 与各模块的集成

| 模块 | safe 操作 | moderate 操作 | dangerous 操作 |
| ---- | ---------- | -------------- | --------------- |
| **项目文件** | 读取、预览 | 创建、修改 | 删除、移动、重命名 |
| **记忆** | 读取所有记忆 | 添加、编辑记忆 | 删除记忆 |
| **知识库** | 读取已解析内容 | 添加新条目、触发解析 | 删除条目 |
| **技能** | 查看技能列表/描述 | 执行技能指令 | — |
| **会话** | 读取历史消息 | — | 删除会话 |

---

## 6. 组件架构

### 6.1 目录结构

```text
apps/electron/src/renderer/
├── main.tsx                       # 入口
├── App.tsx                        # 根组件 + Provider
├── index.css                      # 全局样式
│
├── atoms/                         # Jotai 状态原子
│   ├── workspace.ts               # 工作区相关状态
│   ├── config.ts                  # 全局配置状态（GlobalConfig）
│   ├── navigation.ts              # 导航/路由状态
│   ├── project.ts                 # 项目与文件浏览状态
│   └── session.ts                 # 会话与消息状态
│
├── components/                    # 通用组件
│   ├── Sidebar/                   # 左侧栏
│   │   ├── Sidebar.tsx
│   │   ├── XiaoAEntry.tsx         # 小A入口项
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── NavSection.tsx         # 配置导航区（Agent/技能/记忆/知识库）
│   │   ├── ProjectList.tsx        # 项目列表区
│   │   └── SettingsEntry.tsx      # 设置入口项
│   │
│   ├── XiaoAView/                 # 小A对话视图
│   │   ├── XiaoAView.tsx          # 小A主视图（会话列表 + 对话区）
│   │   └── XiaoASessionList.tsx   # 小A的会话列表
│   │
│   ├── Settings/                  # 全局设置页面
│   │   └── SettingsPage.tsx       # LLM配置、外观、记忆管理、关于
│   │
│   ├── Config/                    # 工作区配置页面
│   │   ├── AgentConfig.tsx
│   │   ├── SkillsManager.tsx
│   │   ├── MemoriesManager.tsx
│   │   └── KnowledgeManager.tsx
│   │
│   ├── ProjectView/               # 项目工作视图
│   │   ├── ProjectView.tsx        # 三栏布局容器
│   │   ├── FileExplorer.tsx       # 文件浏览器
│   │   ├── SessionList.tsx        # 会话列表
│   │   └── OperationArea/         # 右侧操作区
│   │       ├── OperationArea.tsx
│   │       ├── ChatView.tsx       # 对话视图
│   │       ├── FilePreview.tsx    # 文件预览
│   │       └── MessageInput.tsx   # 消息输入框 + 技能栏
│   │
│   └── common/                    # 通用基础组件
│       ├── TitleBar.tsx           # 自定义标题栏
│       └── EmptyState.tsx         # 空状态占位
│
└── lib/
    ├── utils.ts                   # 工具函数
    └── storage.ts                 # IPC 存储封装
```

### 6.2 组件层级

```text
App
├── TitleBar
└── MainLayout
    ├── Sidebar
    │   ├── XiaoAEntry
    │   ├── WorkspaceSwitcher
    │   ├── NavSection
    │   │   ├── NavItem (Agent)
    │   │   ├── NavItem (技能)
    │   │   ├── NavItem (记忆)
    │   │   └── NavItem (知识库)
    │   ├── ProjectList
    │   │   ├── ProjectItem × N
    │   │   └── AddProjectButton
    │   └── SettingsEntry
    │
    └── MainContent (根据 activeView 切换)
        │
        ├── [activeView = "xiaoa"]     → XiaoAView
        │                                 ├── XiaoASessionList
        │                                 ├── ChatView
        │                                 └── MessageInput
        │
        ├── [activeView = "agent"]     → AgentConfig
        ├── [activeView = "skills"]    → SkillsManager
        ├── [activeView = "memories"]  → MemoriesManager
        ├── [activeView = "knowledge"] → KnowledgeManager
        │
        ├── [activeView = "project"]   → ProjectView
        │                                 ├── MiddleColumn
        │                                 │   ├── FileExplorer
        │                                 │   └── SessionList
        │                                 └── OperationArea
        │                                     ├── ChatView / FilePreview
        │                                     └── MessageInput
        │
        └── [activeView = "settings"]  → SettingsPage
```

---

## 7. 状态管理（Jotai）

### 7.1 核心 Atoms

```typescript
// atoms/config.ts
import { atom } from "jotai";

// 全局配置（从 ~/.xiaoa/config.json 加载）
const globalConfigAtom = atom<GlobalConfig>({
  activeWorkspaceId: null,
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-5",
  },
  preferences: {
    theme: "system",
    language: "zh-CN",
  },
  memoryLimit: 5000,
});
```

```typescript
// atoms/workspace.ts
import { atom } from "jotai";

// 所有工作区列表
const workspacesAtom = atom<Workspace[]>([]);

// 当前活跃工作区 ID（从 globalConfigAtom 派生）
const activeWorkspaceIdAtom = atom<string | null>(null);

// 当前工作区（派生，null 表示小A模式）
const activeWorkspaceAtom = atom((get) => {
  const id = get(activeWorkspaceIdAtom);
  return get(workspacesAtom).find((w) => w.id === id) ?? null;
});

// 当前工作区的技能/记忆/知识库
// skillsAtom 存储解析后的 Skill 元数据（name + description + icon），用于列表展示和 / 菜单
// 完整 instructions 按需通过 SKILL_GET 加载
const skillsAtom = atom<Skill[]>([]);
const memoriesAtom = atom<Memory[]>([]);
const knowledgeAtom = atom<Knowledge[]>([]);
```

```typescript
// atoms/navigation.ts

// 左侧栏选中项类型
type ActiveView =
  | { type: "xiaoa" }                          // 小A对话
  | { type: "agent" }
  | { type: "skills" }
  | { type: "memories" }
  | { type: "knowledge" }
  | { type: "project"; projectId: string }
  | { type: "settings" };                      // 全局设置

const activeViewAtom = atom<ActiveView>({ type: "xiaoa" });  // 默认进入小A
```

```typescript
// atoms/project.ts

// 当前工作区的项目列表
const projectsAtom = atom<Project[]>([]);

// 当前项目中选中的文件路径（用于文件预览）
const selectedFilePathAtom = atom<string | null>(null);
```

```typescript
// atoms/session.ts

// 当前项目的会话列表
const sessionsAtom = atom<Session[]>([]);

// 当前活跃会话 ID
const activeSessionIdAtom = atom<string | null>(null);

// 当前会话的消息列表
const messagesAtom = atom<Message[]>([]);

// 操作区显示模式
type OperationMode = "chat" | "preview";
const operationModeAtom = atom<OperationMode>("chat");
```

### 7.2 状态流转

```text
首次打开应用
  → 读取 globalConfigAtom
  → activeWorkspaceId = null → activeViewAtom = { type: "xiaoa" }
  → 加载小A的 sessions/memories

用户点击"小A"
  → 更新 activeViewAtom = { type: "xiaoa" }
  → 加载小A的 sessions（从 ~/.xiaoa/xiaoa/sessions/）

用户点击"设置"
  → 更新 activeViewAtom = { type: "settings" }

用户切换工作区
  → 更新 activeWorkspaceIdAtom（同步到 globalConfigAtom）
  → 加载该工作区的 skills/memories/knowledge/projects
  → 重置 activeViewAtom 为首个项目或 agent

用户点击左侧栏项目
  → 更新 activeViewAtom = { type: "project", projectId }
  → 加载该项目的 sessions
  → 加载该项目的文件树

用户选择会话
  → 更新 activeSessionIdAtom
  → 加载该会话的 messages
  → operationModeAtom = "chat"

用户点击文件
  → 更新 selectedFilePathAtom
  → operationModeAtom = "preview"
```

---

## 8. IPC 通道设计

### 8.1 通道常量（@xiaoa/types）

```typescript
export const IPC_CHANNELS = {
  // 全局配置
  CONFIG_GET: "config:get",                    // 读取 GlobalConfig
  CONFIG_UPDATE: "config:update",              // 更新 GlobalConfig（部分更新）

  // LLM 密钥（单独通道，走加密存储 credentials.enc）
  LLM_SET_KEY: "llm:setKey",                  // 设置 API 密钥（加密后写入）
  LLM_TEST: "llm:test",                       // 测试 API 连接是否正常

  // 工作区
  WORKSPACE_LIST: "workspace:list",
  WORKSPACE_GET: "workspace:get",
  WORKSPACE_CREATE: "workspace:create",
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_DELETE: "workspace:delete",

  // 技能（Agent Skills 标准格式，操作磁盘上的技能目录）
  SKILL_LIST: "skill:list",           // 扫描 skills/ 目录，返回所有技能元数据
  SKILL_GET: "skill:get",             // 读取并解析单个 SKILL.md，返回完整 Skill 对象
  SKILL_CREATE: "skill:create",       // 创建技能目录 + 生成 SKILL.md
  SKILL_UPDATE: "skill:update",       // 重写 SKILL.md（从 Skill 对象序列化为 frontmatter + body）
  SKILL_DELETE: "skill:delete",       // 删除整个技能目录
  SKILL_IMPORT: "skill:import",       // 从外部路径导入技能目录（复制到 skills/）

  // 记忆（index.json + 独立 .md 文件，支持自动清理）
  MEMORY_LIST: "memory:list",             // 读取 index.json，返回所有记忆元数据
  MEMORY_GET: "memory:get",              // 读取单条记忆的 .md 内容
  MEMORY_CREATE: "memory:create",        // 创建 .md 文件 + 更新 index.json
  MEMORY_UPDATE: "memory:update",        // 更新 .md 内容和/或 index.json 元数据
  MEMORY_DELETE: "memory:delete",        // 删除 .md 文件 + 从 index.json 移除
  MEMORY_REF: "memory:ref",             // Agent 引用记忆时调用，递增 refs 和 lastReferencedAt
  MEMORY_CLEANUP: "memory:cleanup",     // 触发自动清理（可由系统定时或手动触发）

  // 知识库（导入 → 后台解析 → Markdown）
  KNOWLEDGE_LIST: "knowledge:list",
  KNOWLEDGE_ADD: "knowledge:add",           // 添加来源，自动触发后台解析任务
  KNOWLEDGE_REMOVE: "knowledge:remove",     // 删除条目 + 对应的解析文件
  KNOWLEDGE_REPARSE: "knowledge:reparse",   // 重新解析（解析失败或源文件更新时）
  KNOWLEDGE_READ: "knowledge:read",         // 读取解析后的 Markdown 内容
  KNOWLEDGE_STATUS: "knowledge:status",     // Main → Renderer 推送解析进度/状态变更

  // 项目
  PROJECT_LIST: "project:list",
  PROJECT_OPEN: "project:open",       // 打开文件夹选择器
  PROJECT_CLOSE: "project:close",
  PROJECT_READ_DIR: "project:readDir", // 读取目录树

  // 会话
  SESSION_LIST: "session:list",
  SESSION_CREATE: "session:create",
  SESSION_DELETE: "session:delete",
  SESSION_MESSAGES: "session:messages",

  // 文件
  FILE_READ: "file:read",             // 读取文件内容（预览）

  // 权限
  PERMISSION_GET: "permission:get",           // 获取当前权限模式
  PERMISSION_SET: "permission:set",           // 切换权限模式
  PERMISSION_REQUEST: "permission:request",   // Main → Renderer 请求用户确认操作
  PERMISSION_RESPOND: "permission:respond",   // Renderer → Main 用户确认/拒绝结果

  // 对话（流式）
  CHAT_SEND: "chat:send",
  CHAT_STREAM: "chat:stream",         // Main → Renderer 流式推送
  CHAT_ABORT: "chat:abort",
} as const;
```

### 8.2 通信模式

```text
[Renderer]                    [Main]
    │                           │
    │── workspace:list ────────►│  invoke/handle (请求-响应)
    │◄──── Workspace[] ────────│
    │                           │
    │── knowledge:add ─────────►│  invoke (添加知识来源)
    │◄──── Knowledge ─────────│  返回 pending 状态的条目
    │                           │  ┌─────────────────────┐
    │◄── knowledge:status ─────│  │ 后台解析任务         │
    │    { status: "parsing" }  │  │ PDF/DOCX/URL → .md  │
    │◄── knowledge:status ─────│  └─────────────────────┘
    │    { status: "ready" }    │
    │                           │
    │── chat:send ─────────────►│  invoke (发起对话)
    │                           │
    │◄── chat:stream ──────────│  send (流式推送，Main → Renderer)
    │◄── chat:stream ──────────│
    │                           │
    │◄── permission:request ───│  Agent 请求写入文件（Review 模式）
    │    { action, target }     │  流式暂停，等待用户确认
    │── permission:respond ────►│  用户点击 [允许] / [拒绝]
    │                           │  流式恢复
    │                           │
    │◄── chat:stream ──────────│
    │◄── chat:stream [done] ───│
    │                           │
    │── chat:abort ────────────►│  invoke (中断对话)
```

---

## 9. 实现路线图

### Phase 1 — 基础骨架

- 实现左侧栏 + 主内容区的壳布局
- **全局设置初始化**（config.json 读写 + 设置页面 UI）
- **内置小A基础对话**（小A入口 + 对话视图 + 会话管理）
- 工作区 CRUD 和切换
- 本地存储层（JSON 文件读写 + credentials.enc 加密存储）
- IPC 通道注册（含 CONFIG_*和 LLM_* 通道）

### Phase 2 — Agent 配置

- Agent 配置页面
- 技能管理页面（CRUD + SKILL.md 可视化编辑 + 导入/导出）
- 记忆管理页面
- 知识库管理页面（本地文件拖入 + URL 粘贴 + 后台解析为 Markdown）

### Phase 3 — 项目与文件

- 打开本地文件夹
- 文件树浏览器（递归目录读取）
- 文件预览（文本、图片、PDF）

### Phase 4 — 对话系统

- 会话 CRUD
- 消息输入与展示
- 流式响应渲染
- `@` 引用文件作为上下文
- 技能快捷调用（`/` 菜单触发，`$ARGUMENTS` 参数传递）

### Phase 5 — Agent 集成

- 接入 LLM（通过 pi-agent-core 或直接 API）
- System Prompt 组装（Agent 人设 + 记忆 + 知识库内容 + 文件上下文）
- 工具调用（文件读写等内置能力）

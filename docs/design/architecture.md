# "小A"Application架构设计

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

### 1.2 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Electron Forge + React 19 |
| 样式 | TailwindCSS 4 + shadcn/ui |
| 路由 | TanStack Router（文件路由） |
| 状态管理 | TanStack Query（服务端状态） + useState（局部状态） |
| IPC | oRPC（类型安全，MessagePort 通信） |
| Schema | Zod 4 |
| 国际化 | i18next |
| 动画 | Motion |
| Agent SDK | @mariozechner/pi-agent-core（Agent 循环 + 工具执行 + 事件流） |
| LLM 抽象 | @mariozechner/pi-ai（多 Provider 统一接口：Anthropic / OpenAI / Google 等） |
| 代码质量 | Biome（lint/format） + tsgo（类型检查） + React Compiler |

### 1.3 用户画像

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
| **GlobalConfig** | 应用级全局配置（独立于工作区） | activeWorkspaceId, llm, preferences |
| **Workspace** | 顶层容器，定义一个完整的 Agent 工作环境 | id, name, agentConfig, createdAt |
| **Agent** | 工作区的 AI 助手配置（内嵌于 Workspace） | name, avatar, systemPrompt, model, temperature |
| **Skill** | 遵循 Agent Skills 标准的指令包，含 SKILL.md 入口 + 参考资料 | name, description, icon, instructions, references/ |
| **Memory** | 两层持久化记忆：Daily Log（Agent 自动追加）+ MEMORY.md（长期知识） | MEMORY.md, daily/YYYY-MM-DD.md, FTS5 索引 |
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
│  记忆                                           │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │  # 长期记忆                              │  │
│  │                                          │  │
│  │  ## 用户偏好                             │  │
│  │  - 偏好中文回复，正式语气                 │  │
│  │  - 文档格式偏好 Markdown                 │  │
│  │                                          │  │
│  │  ## 重要决策                             │  │
│  │  - 2026-02-10: 项目报告采用季度汇总      │  │
│  │  ...                                     │  │
│  │                                          │  │
│  │  （Markdown 编辑器，所见即所得）           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  提示：Agent 会自动将重要信息保存到这里。        │
│  你也可以直接编辑来调整 Agent 的记忆。           │
│                                                 │
└────────────────────────────────────────────────┘
```

核心变化：

- 不再是分类标签列表（偏好/领域/习惯），而是单个 Markdown 文件的编辑器
- 用户直接编辑 MEMORY.md，所见即所得
- 更符合 Clawdbot 的 "透明可编辑" 原则

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
// Memory — 两层持久化记忆（参考 Clawdbot）
//
// Layer 1: Daily Log — Agent 自动追加的临时笔记
//   磁盘: memories/daily/YYYY-MM-DD.md（对用户隐藏）
//   内容: 每日对话中的关键信息，带时间戳的追加式日志
//
// Layer 2: Long-term Memory — 持久知识
//   磁盘: memories/MEMORY.md（用户可在记忆管理页查看/编辑）
//   内容: 用户偏好、重要决策、事实、经验教训等
//
// 检索: Agent 通过 memory_search 工具按需搜索
//       FTS5 全文索引，后续可扩展向量搜索
// 写入: Agent 使用标准 write 工具写入记忆文件
//       写入目标由 prompt 指引（临时→Daily Log, 持久→MEMORY.md）
// ============================================

/** 记忆搜索结果 */
interface MemorySearchResult {
  path: string;                    // 文件路径（相对于工作区）
  startLine: number;
  endLine: number;
  score: number;                   // 匹配分数
  snippet: string;                 // 匹配片段
}

/** 记忆索引状态（SQLite FTS5） */
interface MemoryIndex {
  workspaceId: string;
  dbPath: string;                  // SQLite 数据库路径
  lastIndexedAt: number;
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
│   │   ├── MEMORY.md              # Layer 2: 长期记忆（用户可编辑）
│   │   └── daily/                 # Layer 1: 每日日志（对用户隐藏）
│   │       └── YYYY-MM-DD.md
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
        ├── memories/              # 两层记忆（参考 Clawdbot）
        │   ├── MEMORY.md         # Layer 2: 长期记忆（用户可编辑）
        │   └── daily/            # Layer 1: 每日日志（对用户隐藏）
        │       └── YYYY-MM-DD.md
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
- **记忆即 Markdown**：记忆是纯 Markdown 文件，用户可直接阅读和编辑（MEMORY.md）。Agent 自动写入的 Daily Log 对用户隐藏，仅通过搜索被间接使用
- **搜索优于注入**：Agent 不将全部记忆加载到 context。每次对话开始时 Agent 自动读取 MEMORY.md，需要更多上下文时通过 `memory_search` 搜索 Daily Log
- **FTS5 全文索引**：使用 SQLite FTS5 实现关键词搜索。文件保存时自动分块（~400 token，80 token overlap）并建立索引。后续可扩展 sqlite-vec 向量搜索
- **Pre-compaction flush**：对话 context 接近上限时，Agent 自动将重要信息写入 `memories/daily/YYYY-MM-DD.md`，然后再压缩对话历史。防止 compaction 丢失关键信息
- **会话结束钩子**：会话结束时（手动 `/new` 或空闲超时），自动提取最近 N 条消息的摘要写入 Daily Log
- 会话消息使用 JSONL 格式（参考 craft-agents），支持追加写入，避免大文件重写
- 工作区配置使用 JSON 文件，结构清晰，方便人工检查
- 每个工作区完全隔离，删除工作区只需删除整个目录
- **theme / language 使用 localStorage**：主题模式和界面语言存储在 Renderer 端的 `localStorage` 中，避免启动时闪烁（FOUC）。Main 进程通过 oRPC `theme.get()` 同步 nativeTheme 设置

**MEMORY.md 文件格式示例**：

```markdown
# 长期记忆

## 用户偏好
- 偏好中文回复，正式语气
- 文档格式偏好 Markdown
- 从事教育行业，关注 K12

## 重要决策
- 2026-02-10: 项目报告采用季度汇总模式
- 2026-02-12: 数据分析优先使用表格呈现

## 经验教训
- PDF 批量翻译：先提取目录结构再逐章翻译效果更好
```

**Daily Log 文件格式示例**（`daily/2026-02-14.md`）：

```markdown
# 2026-02-14

## 10:30 - 文档整理
用户要求整理项目报告，偏好简洁的三段式摘要。
文件: report-q4.pdf，输出到 summary-q4.md。

## 14:15 - 翻译任务
翻译 API 文档（英→中），保留代码块不翻译。
用户确认术语表：endpoint=端点, authentication=认证。
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

**索引数据库存放位置**：

```text
~/.xiaoa/
├── indexes/                       # 记忆搜索索引（派生数据）
│   ├── xiaoa.sqlite               # 内置小A的记忆索引
│   └── {workspace-id}.sqlite      # 各工作区的记忆索引
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
 *   - Agent 写入 Daily Log / 更新 MEMORY.md
 *   - 添加知识库条目
 *   - 执行技能指令
 *
 * dangerous（危险）— Review 和 Auto 模式都需确认（可配置 Auto 跳过）
 *   - 删除文件
 *   - 移动/重命名文件
 *   - 批量文件操作
 *   - 删除知识库条目
 *   - 清空 Daily Log
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
| **记忆** | 读取 MEMORY.md, 搜索记忆 | Agent 写入 Daily Log, Agent 更新 MEMORY.md | 用户清空 Daily Log |
| **知识库** | 读取已解析内容 | 添加新条目、触发解析 | 删除条目 |
| **技能** | 查看技能列表/描述 | 执行技能指令 | — |
| **会话** | 读取历史消息 | — | 删除会话 |

---

## 6. 组件架构

### 6.1 目录结构

```text
src/
├── main.ts                        # Electron Main 进程入口
├── preload.ts                     # Preload 脚本
├── renderer.ts                    # Renderer 进程入口
├── app.tsx                        # React 根组件
│
├── actions/                       # 客户端 IPC 调用封装（Renderer → Main）
│   ├── language.ts                # 语言切换
│   ├── shell.ts                   # Shell 操作（打开外部链接等）
│   ├── theme.ts                   # 主题切换
│   └── window.ts                  # 窗口控制（最小化/最大化/关闭）
│
├── ipc/                           # oRPC handlers（Main 进程）
│   ├── router.ts                  # 聚合所有 domain router
│   ├── handler.ts                 # IPC handler 注册
│   ├── context.ts                 # oRPC 上下文
│   ├── manager.ts                 # IPC 管理器
│   ├── app/                       # 应用信息
│   ├── shell/                     # Shell 操作
│   ├── theme/                     # 主题管理
│   └── window/                    # 窗口控制
│
├── components/                    # React 组件
│   ├── ui/                        # shadcn/ui 基础组件
│   ├── drag-window-region.tsx     # 窗口拖拽区域
│   ├── external-link.tsx          # 外部链接
│   ├── lang-toggle.tsx            # 语言切换
│   ├── navigation-menu.tsx        # 导航菜单
│   └── toggle-theme.tsx           # 主题切换
│
├── layouts/                       # 布局组件
│   └── base-layout.tsx            # 基础布局
│
├── routes/                        # TanStack Router 文件路由
│   ├── __root.tsx                 # 根路由（Provider + Layout）
│   ├── index.tsx                  # 首页路由
│   └── second.tsx                 # 示例路由
│
├── localization/                  # i18n 国际化
│   ├── i18n.ts                    # i18next 初始化
│   ├── langs.ts                   # 语言资源
│   └── language.ts                # 语言工具
│
├── constants/                     # 常量定义
├── styles/                        # 全局样式
├── types/                         # 类型定义
├── utils/                         # 工具函数
└── tests/                         # 测试
```

### 6.2 组件层级

```text
__root.tsx (TanStack Router 根路由)
├── QueryClientProvider (TanStack Query)
├── BaseLayout
│   ├── DragWindowRegion          # 窗口拖拽 + 标题栏
│   └── <Outlet />                # 路由出口
│
├── /  (index.tsx)                → 首页
├── /second  (second.tsx)         → 示例页
│
│  ── 规划中的路由 ──
├── /xiaoa                        → 小A对话视图
├── /settings                     → 全局设置页
├── /workspace/:id/agent          → Agent 配置页
├── /workspace/:id/skills         → 技能管理页
├── /workspace/:id/memories       → 记忆管理页
├── /workspace/:id/knowledge      → 知识库管理页
└── /workspace/:id/project/:pid   → 项目工作视图
```

**路由说明**：导航状态完全由 TanStack Router URL 驱动，不再使用 `activeView` atom。页面切换即路由切换。

---

## 7. 状态管理（TanStack Query + Router）

项目不使用全局状态库（Jotai / Redux / Zustand），而是采用以下策略：

- **服务端状态**（工作区、技能、记忆、知识库、会话、消息、配置）→ TanStack Query（`useQuery` / `useMutation`）
- **导航状态**（当前页面、活跃工作区、活跃项目）→ TanStack Router 路由参数
- **UI 局部状态**（选中文件、操作模式、表单输入）→ `useState` / URL search params

### 7.1 服务端状态（TanStack Query）

```typescript
// 全局配置
function useGlobalConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => client.config.get(),
  });
}

function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GlobalConfig>) => client.config.update(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["config"] }),
  });
}

// 工作区列表
function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => client.workspace.list(),
  });
}

// 当前工作区的技能（按 workspaceId 区分缓存）
function useSkills(workspaceId: string) {
  return useQuery({
    queryKey: ["skills", workspaceId],
    queryFn: () => client.skill.list({ workspaceId }),
  });
}

// 会话消息
function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => client.session.messages({ sessionId }),
  });
}
```

### 7.2 导航状态（TanStack Router）

```text
URL 即状态，不需要额外的 navigation atom：

/                                → 首页（小A对话）
/settings                        → 全局设置
/workspace/:workspaceId/agent    → Agent 配置
/workspace/:workspaceId/skills   → 技能管理
/workspace/:workspaceId/memories → 记忆管理
/workspace/:workspaceId/knowledge → 知识库管理
/workspace/:workspaceId/project/:projectId → 项目工作视图

URL search params 承载 UI 状态：
?session=xxx                     → 当前活跃会话
?file=path/to/file               → 当前预览的文件
?mode=chat|preview               → 操作区模式
```

### 7.3 状态流转

```text
首次打开应用
  → 路由进入 / → 首页（小A对话）
  → useGlobalConfig() 从 Main 进程读取配置
  → 配置中的 theme/language 已由 localStorage 预加载

用户点击"小A"
  → navigate("/")
  → useMessages(xiaoaSessionId) 自动加载会话

用户点击"设置"
  → navigate("/settings")

用户切换工作区
  → navigate("/workspace/:newId/agent")
  → useSkills(newId)、useMemories(newId) 等自动触发
  → 旧工作区数据在 Query 缓存中保留，切回时秒开

用户点击左侧栏项目
  → navigate("/workspace/:wid/project/:pid")
  → useSessions(pid) 自动加载该项目的会话列表

用户选择会话
  → 更新 URL search params: ?session=xxx&mode=chat
  → useMessages(xxx) 自动加载消息

用户点击文件
  → 更新 URL search params: ?file=path&mode=preview

缓存失效
  → mutation 成功后调用 queryClient.invalidateQueries()
  → 相关 useQuery 自动重新拉取数据
```

---

## 8. IPC 通信设计（oRPC）

使用 [oRPC](https://orpc.dev) 实现 Main ↔ Renderer 类型安全通信，取代传统的 `ipcMain.handle` / `ipcRenderer.invoke` 字符串通道模式。

### 8.1 oRPC Router 结构

IPC handlers 按领域组织为嵌套 router，所有 procedure 的输入通过 Zod schema 验证：

```typescript
// src/ipc/router.ts — 聚合所有 domain router
export const router = {
  theme,    // 主题管理：get / set
  window,   // 窗口控制：minimize / maximize / close
  app,      // 应用信息：getVersion / getName
  shell,    // Shell 操作：openExternal

  // ── 以下为规划中的 domain router ──
  config,      // 全局配置：get / update
  llm,         // LLM 密钥：setKey / test
  workspace,   // 工作区 CRUD：list / get / create / update / delete
  skill,       // 技能管理：list / get / create / update / delete / import
  memory,      // 记忆管理：read / write / search / get / reindex
  knowledge,   // 知识库：list / add / remove / reparse / read
  project,     // 项目管理：list / open / close / readDir
  session,     // 会话管理：list / create / delete / messages
  file,        // 文件操作：read
  permission,  // 权限管理：get / set / request / respond
  chat,        // 对话：send / abort
};
```

**调用方式**（Renderer 端）：

```typescript
// src/actions/ 中的封装函数通过 oRPC client 调用
import { client } from "@/ipc/client";

// 类型安全、自动补全、编译时检查
const workspaces = await client.workspace.list();
const config = await client.config.get();
await client.theme.set({ mode: "dark" });
```

### 8.2 通信模式

```text
[Renderer]                         [Main]
    │                                │
    │── client.workspace.list() ───►│  oRPC 请求-响应（通过 MessagePort）
    │◄──── Workspace[] ────────────│  端到端类型安全
    │                                │
    │── client.knowledge.add() ────►│  添加知识来源
    │◄──── Knowledge (pending) ────│
    │                                │  ┌─────────────────────┐
    │◄── Query invalidation ───────│  │ 后台解析任务         │
    │    （轮询或事件推送）            │  │ PDF/DOCX/URL → .md  │
    │                                │  └─────────────────────┘
    │                                │
    │── client.chat.send() ────────►│  发起对话
    │◄── 流式响应 ─────────────────│  流式推送（Main → Renderer）
    │                                │
    │── client.chat.abort() ───────►│  中断对话
    │                                │
    │◄── permission:request ───────│  Agent 请求写入文件（Review 模式）
    │── permission:respond ────────►│  用户确认/拒绝
    │                                │
```

**关键区别**：

- 不再使用字符串通道名（如 `"workspace:list"`），而是 `client.workspace.list()` 方法调用
- 输入/输出类型由 Zod schema 定义，编译时即可发现类型错误
- Renderer 端通过 `src/actions/` 封装调用逻辑，组件不直接访问 client

---

## 9. Agent 集成架构（pi-agent-core）

基于 `@mariozechner/pi-agent-core`（来自 [pi-mono](https://github.com/badlogic/pi-mono) 仓库）实现 Agent 能力。该 SDK 提供 Agent 循环、工具执行、事件流等核心机制，小A在此之上实现记忆、知识库、权限等业务逻辑。

### 9.1 依赖关系

```text
@mariozechner/pi-ai              ← 多 Provider LLM 统一接口（Model, Message, streamSimple）
  └── @mariozechner/pi-agent-core ← Agent 循环 + 工具执行 + 事件流
        └── 小A                    ← 业务层：记忆、知识库、权限、UI
```

`pi-ai` 提供 Provider 无关的 LLM 抽象（Anthropic / OpenAI / Google / Bedrock 等），`pi-agent-core` 在此之上封装了有状态的 Agent 类。

### 9.2 核心消息流

```text
用户输入
    │
    ▼
agent.prompt("你好")
    │
    ▼
AgentMessage[]（含自定义消息类型）
    │
    ▼  transformContext() — 上下文裁剪、记忆注入、Pre-compaction flush
AgentMessage[]（变换后）
    │
    ▼  convertToLlm() — 过滤自定义消息，转为 LLM 可消费的 Message[]
Message[]（user / assistant / toolResult）
    │
    ▼  streamFn() — streamSimple() 直调 或 streamProxy() 代理
LLM Provider
    │
    ▼  SSE 事件流
AgentEvent stream
    │
    ▼  agent.subscribe(callback)
UI 更新（Renderer 进程）
```

### 9.3 Agent 实例化

Agent 在 Main 进程中创建，通过 oRPC 的 `chat.send` / `chat.abort` 暴露给 Renderer。

```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: buildSystemPrompt(workspace, memoryContent),
    model: getModel(provider, modelId),
    thinkingLevel: "off",
    tools: buildTools(workspace, project),
    messages: [],
  },
  convertToLlm: xiaoaConvertToLlm,
  transformContext: xiaoaTransformContext,
  getApiKey: async (provider) => getDecryptedKey(provider),
});
```

**关键回调**：

| 回调 | 职责 | 小A 实现 |
| --- | --- | --- |
| `convertToLlm` | 将 AgentMessage（含自定义类型）转为 LLM Message | 过滤 notification / artifact 等自定义消息 |
| `transformContext` | 每次 LLM 调用前变换上下文 | Pre-compaction flush（写入 Daily Log）+ 上下文裁剪 |
| `getApiKey` | 按 Provider 获取 API Key | 从 credentials.enc 解密读取 |

### 9.4 工具定义

工具使用 `AgentTool` 接口，参数 schema 使用 TypeBox（非 Zod）：

```typescript
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";

// 记忆搜索工具
const memorySearchSchema = Type.Object({
  query: Type.String({ description: "搜索关键词" }),
  limit: Type.Optional(Type.Number({ description: "最大结果数，默认 5" })),
});

export function createMemorySearchTool(workspaceId: string): AgentTool<typeof memorySearchSchema> {
  return {
    name: "memory_search",
    label: "搜索记忆",
    description: "搜索 Daily Log 和 MEMORY.md 中的历史记忆，返回匹配片段",
    parameters: memorySearchSchema,
    execute: async (_toolCallId, { query, limit }, signal) => {
      const results = await fts5Search(workspaceId, query, limit ?? 5);
      return {
        content: [{ type: "text", text: formatSearchResults(results) }],
        details: { resultCount: results.length },
      };
    },
  };
}
```

**小A 内置工具规划**：

| 工具 | 说明 | 风险等级 |
| --- | --- | --- |
| `file_read` | 读取项目文件 | safe |
| `file_write` | 创建/修改文件 | moderate |
| `file_list` | 列出目录结构 | safe |
| `memory_search` | FTS5 搜索记忆（MEMORY.md + Daily Log） | safe |
| `memory_write` | 写入 Daily Log 或更新 MEMORY.md | moderate |
| `knowledge_read` | 读取知识库解析后的内容 | safe |

工具的风险等级与 Section 5 权限模型联动：Agent 执行 moderate/dangerous 工具时，在 Review 模式下需用户确认。

### 9.5 自定义消息类型（Declaration Merging）

通过 TypeScript declaration merging 扩展 `AgentMessage`，携带小A特有的消息类型：

```typescript
declare module "@mariozechner/pi-agent-core" {
  interface CustomAgentMessages {
    /** 权限请求：Agent 需要用户确认操作 */
    permissionRequest: {
      role: "permission-request";
      action: string;
      risk: ActionRisk;
      details: string;
      timestamp: number;
    };
    /** 压缩摘要：替代被裁剪的历史消息 */
    compactionSummary: {
      role: "compaction-summary";
      summary: string;
      timestamp: number;
    };
  }
}
```

这些自定义消息在 `convertToLlm` 中被转换或过滤：

```typescript
function xiaoaConvertToLlm(messages: AgentMessage[]): Message[] {
  return messages
    .map((m) => {
      switch (m.role) {
        case "compaction-summary":
          return { role: "user", content: `<context-summary>${m.summary}</context-summary>`, timestamp: m.timestamp };
        case "permission-request":
          return undefined; // UI-only，不发给 LLM
        case "user":
        case "assistant":
        case "toolResult":
          return m;
        default:
          return undefined;
      }
    })
    .filter(Boolean);
}
```

### 9.6 System Prompt 组装

```typescript
function buildSystemPrompt(workspace: Workspace, memoryContent: string): string {
  const parts: string[] = [];

  // 1. Agent 人设
  parts.push(workspace.agent.systemPrompt);

  // 2. 长期记忆（MEMORY.md 全文注入）
  if (memoryContent) {
    parts.push(`# 你的记忆\n\n${memoryContent}`);
  }

  // 3. 知识库摘要（L0: name + description 列表，按需用工具读取全文）
  const knowledgeList = getKnowledgeSummaries(workspace.id);
  if (knowledgeList.length > 0) {
    parts.push(`# 知识库\n\n${knowledgeList.map(k => `- ${k.name}: ${k.description}`).join("\n")}`);
  }

  // 4. 技能列表（仅 model-invocable 的技能，L0: name + description）
  const skills = getModelInvocableSkills(workspace.id);
  if (skills.length > 0) {
    parts.push(`# 可用技能\n\n${skills.map(s => `- /${s.name}: ${s.description}`).join("\n")}`);
  }

  // 5. 行为规则（权限提示、记忆写入指引等）
  parts.push(BEHAVIOR_RULES);

  // 6. 时间和环境
  parts.push(`当前时间: ${new Date().toLocaleString("zh-CN")}`);

  return parts.join("\n\n");
}
```

### 9.7 事件流与 UI 集成

Agent 事件通过 oRPC 流式推送到 Renderer：

```text
AgentEvent 类型：
├── agent_start / agent_end       — Agent 生命周期
├── turn_start / turn_end         — 每轮 LLM 调用
├── message_start / message_end   — 消息边界
├── message_update                — 流式文本增量（text_delta）
├── tool_execution_start          — 工具开始执行
├── tool_execution_update         — 工具执行进度（流式输出）
└── tool_execution_end            — 工具执行完成
```

Renderer 端通过 `agent.subscribe()` 监听事件更新 UI：

```typescript
agent.subscribe((event: AgentEvent) => {
  switch (event.type) {
    case "message_update":
      // event.assistantMessageEvent.type === "text_delta"
      // 追加文本到对话气泡
      break;
    case "tool_execution_start":
      // 显示工具执行状态
      break;
    case "agent_end":
      // 流式结束，最终渲染
      break;
  }
});
```

### 9.8 上下文管理与 Compaction

当对话 context 接近模型上限时，执行 Pre-compaction flush + 消息压缩：

```text
transformContext() 被调用
    │
    ▼
1. 估算 token 用量（chars / 4 启发式）
    │
    ▼
2. 是否超过阈值？ contextTokens > contextWindow - reserveTokens
    │ 否 → 直接返回
    │ 是 ↓
    ▼
3. Pre-compaction flush
   → 提取近期对话中的关键信息
   → 写入 memories/daily/YYYY-MM-DD.md
    │
    ▼
4. 找到裁剪点（从最新消息往回累计，保留 keepRecentTokens）
    │
    ▼
5. 裁剪点之前的消息 → LLM 生成摘要
    │
    ▼
6. 替换为 CompactionSummaryMessage
   → convertToLlm 时转为 <context-summary>...</context-summary>
```

### 9.9 Steering 与 Follow-up

`pi-agent-core` 提供两种队列机制用于对话中的用户干预：

- **Steering（转向）**：工具执行期间打断 Agent，注入新指令。剩余未执行的工具会被跳过
- **Follow-up（追问）**：Agent 完成当前回复后自动追加新任务，无需用户手动发送

```typescript
// 用户在 Agent 执行文件写入时中途打断
agent.steer({ role: "user", content: "等一下，先不要写入", timestamp: Date.now() });

// Agent 完成后自动追问（如自动保存记忆）
agent.followUp({ role: "user", content: "[auto] 请总结本轮对话要点到 Daily Log", timestamp: Date.now() });
```

---

## 10. 实现路线图

### Phase 1 — 基础骨架

- 实现左侧栏 + 主内容区的壳布局
- **全局设置初始化**（config.json 读写 + 设置页面 UI）
- **内置小A基础对话**（小A入口 + 对话视图 + 会话管理）
- 工作区 CRUD 和切换
- 本地存储层（JSON 文件读写 + credentials.enc 加密存储）
- oRPC router 注册（config / llm domain）

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

### Phase 5 — Agent 集成（pi-agent-core）

- 集成 `@mariozechner/pi-agent-core`，在 Main 进程创建 Agent 实例
- 集成 `@mariozechner/pi-ai`，通过 `getModel()` 对接多 LLM Provider
- System Prompt 组装（Agent 人设 + MEMORY.md + 知识库摘要 + 技能列表）
- 实现 `convertToLlm`（自定义消息类型转换）和 `transformContext`（上下文管理）
- 内置工具：`file_read` / `file_write` / `file_list` / `memory_search` / `memory_write` / `knowledge_read`
- 通过 oRPC `chat.send` / `chat.abort` 将 AgentEvent 流式推送到 Renderer
- Compaction：Pre-compaction flush 到 Daily Log + LLM 摘要压缩
- 会话结束钩子：`/new` 或空闲超时时自动写入 Daily Log
- Declaration merging 扩展 `AgentMessage`（权限请求、压缩摘要等自定义消息）

# Agent 工作区架构设计

## 1. 产品概述

小 A 是一个面向非 Coding 群体的 Agent 工作站。用户可以创建**工作区**来定义一个 Agent，为其配置技能、记忆与知识库，然后在工作区内打开**项目**（本地文件夹）来开展多个对话处理工作。

### 1.1 核心概念

```text
工作区 (Workspace)
├── Agent 配置        # 人设、模型选择、行为偏好
├── 技能 (Skills)     # 遵循 Agent Skills 开放标准的指令包（翻译、摘要、改写等）
├── 记忆 (Memories)   # 持久化上下文（用户偏好、领域知识）
├── 知识库 (Knowledge) # 本地文档或在线链接
└── 项目 (Projects)   # 打开的本地文件夹
    └── 会话 (Sessions)  # 属于该项目的对话列表
```text

### 1.2 用户画像

- 非技术用户（写作者、研究员、运营、产品经理等）
- 需要 AI 辅助处理本地文件（文档整理、内容生成、信息提取）
- 不了解也不需要了解 MCP、API 等技术概念

---

## 2. 信息架构

### 2.1 领域模型关系

```text
Workspace 1:1 Agent
Workspace 1:N Project
Workspace 1:N Skill
Workspace 1:N Memory
Workspace 1:N Knowledge
Project    1:N Session
Session    1:N Message
```text

### 2.2 实体定义

| 实体 | 说明 | 关键属性 |
|------|------|----------|
| **Workspace** | 顶层容器，定义一个完整的 Agent 工作环境 | id, name, agentConfig, createdAt |
| **Agent** | 工作区的 AI 助手配置（内嵌于 Workspace） | name, avatar, systemPrompt, model, temperature |
| **Skill** | 遵循 Agent Skills 标准的指令包，含 SKILL.md 入口 + 参考资料 | name, description, icon, instructions, references/ |
| **Memory** | 持久化的上下文片段，Agent 始终可访问 | id, content, category, updatedAt |
| **Knowledge** | 知识库条目（本地文档或在线链接） | id, name, type(local/url), path/url |
| **Project** | 打开的本地文件夹 | id, name, path, workspaceId |
| **Session** | 一次对话 | id, title, projectId, createdAt, updatedAt |
| **Message** | 对话中的单条消息 | id, role, content, sessionId, timestamp |

---

## 3. UI 布局设计

### 3.1 整体布局结构

```text
┌─────────────────────────────────────────────────────────────────┐
│  [-] [□] [×]              小 A                        (拖拽区)  │ ← 自定义标题栏
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
```text

### 3.2 左侧栏详细设计

左侧栏宽度固定（约 200px），分为上下两个区域：

```text
┌────────────────────┐
│ 📎 工作区名称   ▾  │ ← 工作区切换器（下拉选择 + 新建/管理）
├────────────────────┤
│ 🤖 Agent           │ ← 点击 → 主内容区显示 Agent 配置页
│ ⚡ 技能             │ ← 点击 → 主内容区显示技能管理页
│ 🧠 记忆             │ ← 点击 → 主内容区显示记忆管理页
│ 📚 知识库           │ ← 点击 → 主内容区显示知识库管理页
├────────────────────┤ ← 分隔线
│ 📁 项目 A          │ ← 点击 → 主内容区显示项目工作视图
│ 📁 项目 B          │
│ 📁 项目 C          │
│                    │
│ [+ 打开文件夹]     │ ← 打开系统文件选择器
└────────────────────┘
```text

**交互规则**：

- 上部配置项和下部项目共享同一个选中态（同一时刻只有一个选中项）
- 选中项决定主内容区显示什么
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
```text

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
```text

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
```text

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
```text

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
```text

**解析流程**：

1. 用户拖入文件或粘贴 URL → 创建 Knowledge 条目（`status: "pending"`）
2. Main 进程启动后台解析任务 → 状态变为 `"parsing"`，UI 显示进度
3. 解析完成 → 生成 `knowledge/{id}.md`，状态变为 `"ready"`
4. 解析失败 → 状态变为 `"error"`，显示错误原因，支持重新解析

**支持的解析类型**：

| 来源类型 | 解析方式 |
|---------|---------|
| PDF | 文本提取 + 结构化为 Markdown 标题/段落 |
| Word (.docx) | 转换为 Markdown（保留标题层级、列表、表格） |
| HTML / URL | 抓取页面 → 提取正文 → 转为 Markdown |
| 纯文本 / Markdown | 直接复制（无需解析） |
| 图片 | OCR 识别 → 转为 Markdown 文本 |

### 3.4 主内容区 — 项目工作视图

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
```text

**中间栏**由上下两部分组成：

- **上：文件浏览器** — 显示项目文件夹的树形目录，支持展开/折叠子文件夹
- **下：会话列表** — 该项目下的所有对话，按时间排序

**右侧操作区**根据用户操作动态显示：

- 选中会话 → 显示**对话视图**（消息列表 + 输入框 + 技能快捷栏）
- 点击文件 → 显示**文件预览**（文本/图片/PDF 预览）
- 对话中可通过 `@` 引用文件浏览器中的文件作为上下文

### 3.5 完整布局组合

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  [-] [□] [×]                    小 A                          (拖拽区)  │
├──────────┬───────────────────────────────────────────────────────────────┤
│ 工作区 ▾  │                                                              │
├──────────┤               主内容区 (动态切换)                              │
│ Agent    │                                                              │
│ 技能     │   选中配置项 → 显示配置页（全屏）                               │
│ 记忆     │   选中项目   → 显示项目工作视图（文件+会话+操作区）              │
│ 知识库   │                                                              │
├──────────┤                                                              │
│ 项目 A ● │                                                              │
│ 项目 B   │                                                              │
│ 项目 C   │                                                              │
│          │                                                              │
│ [+]      │                                                              │
└──────────┴───────────────────────────────────────────────────────────────┘
  ~200px                            flex-1
```text

---

## 4. 数据模型

### 4.1 类型定义（@xiaoa/types）

```typescript
// ============================================
// Workspace
// ============================================

interface Workspace {
  id: string;
  name: string;
  agent: AgentConfig;
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
// ============================================

interface Memory {
  id: string;
  workspaceId: string;
  category: string;          // 分类标签（偏好、领域、习惯等）
  content: string;
  updatedAt: number;
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
  projectId: string;
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
```text

### 4.2 本地存储结构

```text
~/.xiaoa/
├── config.json                    # 全局配置（活跃工作区 ID、LLM 密钥等）
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
        ├── memories.json          # Memory[]
        ├── knowledge.json         # Knowledge[]（索引 + 状态）
        ├── knowledge/             # 解析后的 Markdown 文件
        │   ├── {knowledge-id}.md  # 每个知识条目对应一个解析后的 .md
        │   └── ...
        ├── projects.json          # Project[]（路径索引）
        └── sessions/
            └── {session-id}.jsonl # 单个会话的消息流（逐行 JSON）
```text

**设计决策**：

- **技能采用目录格式**（Agent Skills 开放标准），每个技能是独立目录，包含 `SKILL.md` 入口文件和可选的 `references/` 子目录。好处：可导入/导出/分享整个技能目录，与生态兼容
- **知识库原始文件与解析结果分离**：`knowledge.json` 存储索引和状态，`knowledge/` 目录存储解析后的 Markdown 文件。原始文件不复制（通过路径/URL 引用），解析后的 `.md` 文件是 Agent 实际消费的内容
- 会话消息使用 JSONL 格式（参考 craft-agents），支持追加写入，避免大文件重写
- 工作区配置使用 JSON 文件，结构清晰，方便人工检查
- 每个工作区完全隔离，删除工作区只需删除整个目录

---

## 5. 组件架构

### 5.1 目录结构

```text
apps/electron/src/renderer/
├── main.tsx                       # 入口
├── App.tsx                        # 根组件 + Provider
├── index.css                      # 全局样式
│
├── atoms/                         # Jotai 状态原子
│   ├── workspace.ts               # 工作区相关状态
│   ├── navigation.ts              # 导航/路由状态
│   ├── project.ts                 # 项目与文件浏览状态
│   └── session.ts                 # 会话与消息状态
│
├── components/                    # 通用组件
│   ├── Sidebar/                   # 左侧栏
│   │   ├── Sidebar.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   ├── NavSection.tsx         # 配置导航区（Agent/技能/记忆/知识库）
│   │   └── ProjectList.tsx        # 项目列表区
│   │
│   ├── Config/                    # 配置页面
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
```text

### 5.2 组件层级

```text
App
├── TitleBar
└── MainLayout
    ├── Sidebar
    │   ├── WorkspaceSwitcher
    │   ├── NavSection
    │   │   ├── NavItem (Agent)
    │   │   ├── NavItem (技能)
    │   │   ├── NavItem (记忆)
    │   │   └── NavItem (知识库)
    │   └── ProjectList
    │       ├── ProjectItem × N
    │       └── AddProjectButton
    │
    └── MainContent (根据 activeView 切换)
        │
        ├── [activeView = "agent"]    → AgentConfig
        ├── [activeView = "skills"]   → SkillsManager
        ├── [activeView = "memories"] → MemoriesManager
        ├── [activeView = "knowledge"] → KnowledgeManager
        │
        └── [activeView = "project"]  → ProjectView
            ├── MiddleColumn
            │   ├── FileExplorer
            │   └── SessionList
            └── OperationArea
                ├── ChatView / FilePreview
                └── MessageInput
```text

---

## 6. 状态管理（Jotai）

### 6.1 核心 Atoms

```typescript
// atoms/workspace.ts
import { atom } from "jotai";

// 所有工作区列表
const workspacesAtom = atom<Workspace[]>([]);

// 当前活跃工作区 ID
const activeWorkspaceIdAtom = atom<string | null>(null);

// 当前工作区（派生）
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
```text

```typescript
// atoms/navigation.ts

// 左侧栏选中项类型
type ActiveView =
  | { type: "agent" }
  | { type: "skills" }
  | { type: "memories" }
  | { type: "knowledge" }
  | { type: "project"; projectId: string };

const activeViewAtom = atom<ActiveView>({ type: "agent" });
```text

```typescript
// atoms/project.ts

// 当前工作区的项目列表
const projectsAtom = atom<Project[]>([]);

// 当前项目中选中的文件路径（用于文件预览）
const selectedFilePathAtom = atom<string | null>(null);
```text

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
```text

### 6.2 状态流转

```text
用户切换工作区
  → 更新 activeWorkspaceIdAtom
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
```text

---

## 7. IPC 通道设计

### 7.1 通道常量（@xiaoa/types）

```typescript
export const IPC_CHANNELS = {
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

  // 记忆
  MEMORY_LIST: "memory:list",
  MEMORY_CREATE: "memory:create",
  MEMORY_UPDATE: "memory:update",
  MEMORY_DELETE: "memory:delete",

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

  // 对话（流式）
  CHAT_SEND: "chat:send",
  CHAT_STREAM: "chat:stream",         // Main → Renderer 流式推送
  CHAT_ABORT: "chat:abort",
} as const;
```text

### 7.2 通信模式

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
    │◄── chat:stream [done] ───│
    │                           │
    │── chat:abort ────────────►│  invoke (中断对话)
```text

---

## 8. 实现路线图

### Phase 1 — 基础骨架

- 实现左侧栏 + 主内容区的壳布局
- 工作区 CRUD 和切换
- 本地存储层（JSON 文件读写）
- IPC 通道注册

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

# Agent 工作区架构设计

## 1. 产品概述

小 A 是一个面向非 Coding 群体的 Agent 工作站。用户可以创建**工作区**来定义一个 Agent，为其配置技能、记忆与参考资料，然后在工作区内打开**项目**（本地文件夹）来开展多个对话处理工作。

### 1.1 核心概念

```
工作区 (Workspace)
├── Agent 配置        # 人设、模型选择、行为偏好
├── 技能 (Skills)     # 预设指令模板（翻译、摘要、改写等）
├── 记忆 (Memories)   # 持久化上下文（用户偏好、领域知识）
├── 参考 (References) # 本地文档或在线链接
└── 项目 (Projects)   # 打开的本地文件夹
    └── 会话 (Sessions)  # 属于该项目的对话列表
```

### 1.2 用户画像

- 非技术用户（写作者、研究员、运营、产品经理等）
- 需要 AI 辅助处理本地文件（文档整理、内容生成、信息提取）
- 不了解也不需要了解 MCP、API 等技术概念

---

## 2. 信息架构

### 2.1 领域模型关系

```
Workspace 1:1 Agent
Workspace 1:N Project
Workspace 1:N Skill
Workspace 1:N Memory
Workspace 1:N Reference
Project    1:N Session
Session    1:N Message
```

### 2.2 实体定义

| 实体 | 说明 | 关键属性 |
|------|------|----------|
| **Workspace** | 顶层容器，定义一个完整的 Agent 工作环境 | id, name, agentConfig, createdAt |
| **Agent** | 工作区的 AI 助手配置（内嵌于 Workspace） | name, avatar, systemPrompt, model, temperature |
| **Skill** | 预设指令模板，用户可在对话中快捷调用 | id, name, icon, prompt, variables |
| **Memory** | 持久化的上下文片段，Agent 始终可访问 | id, content, category, updatedAt |
| **Reference** | 参考资料来源 | id, name, type(local/url), path/url |
| **Project** | 打开的本地文件夹 | id, name, path, workspaceId |
| **Session** | 一次对话 | id, title, projectId, createdAt, updatedAt |
| **Message** | 对话中的单条消息 | id, role, content, sessionId, timestamp |

---

## 3. UI 布局设计

### 3.1 整体布局结构

```
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
│ │参考  │ │                                                      │
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

左侧栏宽度固定（约 200px），分为上下两个区域：

```
┌────────────────────┐
│ 📎 工作区名称   ▾  │ ← 工作区切换器（下拉选择 + 新建/管理）
├────────────────────┤
│ 🤖 Agent           │ ← 点击 → 主内容区显示 Agent 配置页
│ ⚡ 技能             │ ← 点击 → 主内容区显示技能管理页
│ 🧠 记忆             │ ← 点击 → 主内容区显示记忆管理页
│ 📚 参考             │ ← 点击 → 主内容区显示参考管理页
├────────────────────┤ ← 分隔线
│ 📁 项目 A          │ ← 点击 → 主内容区显示项目工作视图
│ 📁 项目 B          │
│ 📁 项目 C          │
│                    │
│ [+ 打开文件夹]     │ ← 打开系统文件选择器
└────────────────────┘
```

**交互规则**：
- 上部配置项和下部项目共享同一个选中态（同一时刻只有一个选中项）
- 选中项决定主内容区显示什么
- 工作区切换器支持搜索、新建、重命名、删除

### 3.3 主内容区 — 配置页面

点击左侧栏的 Agent / 技能 / 记忆 / 参考时，主内容区整体替换为对应配置页：

#### Agent 配置页
```
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
```
┌────────────────────────────────────────────────┐
│  技能                              [+ 新建技能] │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ ✏️ 改写    调整文本风格和语气              │  │
│  │ 📝 摘要    提取文档核心要点               │  │
│  │ 🌐 翻译    在中英文之间翻译               │  │
│  │ 📊 分析    分析数据并生成报告             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ── 选中技能的编辑区域 ──                        │
│  名称     [改写___________________]             │
│  图标     [✏️ ▾]                                │
│  指令     [                          ]          │
│           [  你是一位专业的文本编辑..  ]          │
│           [  请根据以下要求改写：     ]           │
│           [  {input}                 ]           │
│  变量     input: 需要改写的文本                  │
│                                                 │
└────────────────────────────────────────────────┘
```

#### 记忆管理页
```
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

#### 参考管理页
```
┌────────────────────────────────────────────────┐
│  参考                              [+ 添加参考] │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ 📄 产品需求文档.pdf     本地文件           │  │
│  │ 📄 设计规范.md          本地文件           │  │
│  │ 🔗 API 文档             https://...       │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  支持拖入本地文件或粘贴在线链接                   │
│                                                 │
└────────────────────────────────────────────────┘
```

### 3.4 主内容区 — 项目工作视图

点击左侧栏的某个项目时，主内容区显示该项目的工作视图，分为三栏：

```
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

### 3.5 完整布局组合

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [-] [□] [×]                    小 A                          (拖拽区)  │
├──────────┬───────────────────────────────────────────────────────────────┤
│ 工作区 ▾  │                                                              │
├──────────┤               主内容区 (动态切换)                              │
│ Agent    │                                                              │
│ 技能     │   选中配置项 → 显示配置页（全屏）                               │
│ 记忆     │   选中项目   → 显示项目工作视图（文件+会话+操作区）              │
│ 参考     │                                                              │
├──────────┤                                                              │
│ 项目 A ● │                                                              │
│ 项目 B   │                                                              │
│ 项目 C   │                                                              │
│          │                                                              │
│ [+]      │                                                              │
└──────────┴───────────────────────────────────────────────────────────────┘
  ~200px                            flex-1
```

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
// Skill — 预设指令模板
// ============================================

interface Skill {
  id: string;
  workspaceId: string;
  name: string;
  icon: string;              // emoji 或图标标识
  prompt: string;            // 指令模板，支持 {variable} 插值
  variables: SkillVariable[];
}

interface SkillVariable {
  name: string;
  label: string;
  placeholder?: string;
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
// Reference — 参考资料
// ============================================

type ReferenceType = "local" | "url";

interface Reference {
  id: string;
  workspaceId: string;
  name: string;
  type: ReferenceType;
  path?: string;             // type=local 时的文件路径
  url?: string;              // type=url 时的链接地址
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
```

### 4.2 本地存储结构

```
~/.xiaoa/
├── config.json                    # 全局配置（活跃工作区 ID、LLM 密钥等）
└── workspaces/
    └── {workspace-id}/
        ├── workspace.json         # Workspace + AgentConfig
        ├── skills.json            # Skill[]
        ├── memories.json          # Memory[]
        ├── references.json        # Reference[]
        ├── projects.json          # Project[]（路径索引）
        └── sessions/
            └── {session-id}.jsonl # 单个会话的消息流（逐行 JSON）
```

**设计决策**：
- 会话消息使用 JSONL 格式（参考 craft-agents），支持追加写入，避免大文件重写
- 工作区配置使用 JSON 文件，结构清晰，方便人工检查
- 每个工作区完全隔离，删除工作区只需删除整个目录

---

## 5. 组件架构

### 5.1 目录结构

```
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
│   │   ├── NavSection.tsx         # 配置导航区（Agent/技能/记忆/参考）
│   │   └── ProjectList.tsx        # 项目列表区
│   │
│   ├── Config/                    # 配置页面
│   │   ├── AgentConfig.tsx
│   │   ├── SkillsManager.tsx
│   │   ├── MemoriesManager.tsx
│   │   └── ReferencesManager.tsx
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

### 5.2 组件层级

```
App
├── TitleBar
└── MainLayout
    ├── Sidebar
    │   ├── WorkspaceSwitcher
    │   ├── NavSection
    │   │   ├── NavItem (Agent)
    │   │   ├── NavItem (技能)
    │   │   ├── NavItem (记忆)
    │   │   └── NavItem (参考)
    │   └── ProjectList
    │       ├── ProjectItem × N
    │       └── AddProjectButton
    │
    └── MainContent (根据 activeView 切换)
        │
        ├── [activeView = "agent"]    → AgentConfig
        ├── [activeView = "skills"]   → SkillsManager
        ├── [activeView = "memories"] → MemoriesManager
        ├── [activeView = "refs"]     → ReferencesManager
        │
        └── [activeView = "project"]  → ProjectView
            ├── MiddleColumn
            │   ├── FileExplorer
            │   └── SessionList
            └── OperationArea
                ├── ChatView / FilePreview
                └── MessageInput
```

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

// 当前工作区的技能/记忆/参考（派生）
const skillsAtom = atom<Skill[]>([]);
const memoriesAtom = atom<Memory[]>([]);
const referencesAtom = atom<Reference[]>([]);
```

```typescript
// atoms/navigation.ts

// 左侧栏选中项类型
type ActiveView =
  | { type: "agent" }
  | { type: "skills" }
  | { type: "memories" }
  | { type: "references" }
  | { type: "project"; projectId: string };

const activeViewAtom = atom<ActiveView>({ type: "agent" });
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

### 6.2 状态流转

```
用户切换工作区
  → 更新 activeWorkspaceIdAtom
  → 加载该工作区的 skills/memories/references/projects
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

  // 技能
  SKILL_LIST: "skill:list",
  SKILL_CREATE: "skill:create",
  SKILL_UPDATE: "skill:update",
  SKILL_DELETE: "skill:delete",

  // 记忆
  MEMORY_LIST: "memory:list",
  MEMORY_CREATE: "memory:create",
  MEMORY_UPDATE: "memory:update",
  MEMORY_DELETE: "memory:delete",

  // 参考
  REFERENCE_LIST: "reference:list",
  REFERENCE_ADD: "reference:add",
  REFERENCE_REMOVE: "reference:remove",

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
```

### 7.2 通信模式

```
[Renderer]                    [Main]
    │                           │
    │── workspace:list ────────►│  invoke/handle (请求-响应)
    │◄──── Workspace[] ────────│
    │                           │
    │── chat:send ─────────────►│  invoke (发起对话)
    │                           │
    │◄── chat:stream ──────────│  send (流式推送，Main → Renderer)
    │◄── chat:stream ──────────│
    │◄── chat:stream [done] ───│
    │                           │
    │── chat:abort ────────────►│  invoke (中断对话)
```

---

## 8. 实现路线图

### Phase 1 — 基础骨架
- 实现左侧栏 + 主内容区的壳布局
- 工作区 CRUD 和切换
- 本地存储层（JSON 文件读写）
- IPC 通道注册

### Phase 2 — Agent 配置
- Agent 配置页面
- 技能管理页面（CRUD + 模板编辑）
- 记忆管理页面
- 参考管理页面（本地文件拖入 + URL 粘贴）

### Phase 3 — 项目与文件
- 打开本地文件夹
- 文件树浏览器（递归目录读取）
- 文件预览（文本、图片、PDF）

### Phase 4 — 对话系统
- 会话 CRUD
- 消息输入与展示
- 流式响应渲染
- `@` 引用文件作为上下文
- 技能快捷调用

### Phase 5 — Agent 集成
- 接入 LLM（通过 pi-agent-core 或直接 API）
- System Prompt 组装（Agent 人设 + 记忆 + 参考内容 + 文件上下文）
- 工具调用（文件读写等内置能力）

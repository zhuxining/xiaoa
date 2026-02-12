# @xiaoa/ui - UI 组件库

基于 shadcn/ui (New York 风格) + TailwindCSS 4 的共享组件库。

## 包导出

- `@xiaoa/ui` → 组件 + cn() 工具函数
- `@xiaoa/ui/styles` → 主题 CSS 变量

## 组件目录结构

- `src/components/ui/` - shadcn/ui 基础组件
- `src/components/chat/` - 聊天相关组件
- `src/components/input/` - 输入相关组件
- `src/components/message/` - 消息相关组件

## 添加 shadcn/ui 组件

在 packages/ui/ 目录下执行：

```bash
npx shadcn@latest add <component>
```

组件会根据 components.json 配置自动放置到正确位置。

## 主题系统

- 使用 TailwindCSS 4 `@theme` 指令定义 CSS 变量
- OKLCH 色彩空间
- 暗色模式通过 prefers-color-scheme 媒体查询
- 主题文件：`src/styles/index.css`

## 工具函数

- `cn()` (src/lib/utils.ts)：合并 class names，基于 clsx + tailwind-merge
- 所有条件 class 拼接必须使用 cn()

## 规范

- 所有组件通过 src/index.ts 统一导出
- 不要在 UI 组件中添加业务逻辑
- 不要直接引用内部路径，使用包导出
- Peer dependencies：React 19, Radix UI, Lucide React, TailwindCSS 4

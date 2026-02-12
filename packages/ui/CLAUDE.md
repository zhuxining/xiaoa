# @xiaoa/ui - UI 组件库

基于 Base UI (`@base-ui/react`) + TailwindCSS 4 的共享组件库。

## 包导出

```typescript
import { cn, createStateClass } from "@xiaoa/ui";
import "@xiaoa/ui/styles";           // 完整主题
import "@xiaoa/ui/styles/tokens";    // 仅 tokens
import "@xiaoa/ui/styles/components"; // 仅组件样式类
```

## 组件目录结构

- `src/components/chat/` — 聊天相关组件
- `src/components/input/` — 输入相关组件
- `src/components/message/` — 消息相关组件

## Base UI 使用方式

Base UI 是无样式的 headless 组件库。每个组件通过 `className` prop 接受 Tailwind 样式。

### 导入模式

```typescript
// 直接从 @base-ui/react 导入原语
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Tooltip } from "@base-ui/react/tooltip";
```

### 使用预置样式类

项目提供了统一的样式类，直接使用：

```tsx
import { Dialog } from "@base-ui/react/dialog";

<Dialog.Popup className="dialog-panel">
  <Dialog.Title className="dialog-title">标题</Dialog.Title>
  <Dialog.Description className="dialog-description">描述</Dialog.Description>
</Dialog.Popup>
```

可用样式类（定义在 `src/styles/components.css`）：

- `popup-bg`, `popup-shadow`, `popup-rounded` — 弹出层基础
- `btn-base`, `btn-primary`, `btn-secondary`, `btn-outline` — 按钮
- `input-base` — 输入框
- `dialog-*` — 对话框
- `menu-*` — 菜单
- `tooltip-popup` — 提示
- `toast-*` — 通知
- `tabs-*` — 标签页
- `select-*` — 选择器

### 状态样式

Base UI 通过 data 属性暴露组件状态，Tailwind 可直接使用：

```tsx
<Menu.Item className="menu-item data-highlighted:bg-highlight">
```

或使用工具函数：

```typescript
import { createStateClass } from "@xiaoa/ui";

const menuItemClass = createStateClass({
  base: "menu-item",
  states: {
    highlighted: "bg-highlight",
    disabled: "opacity-50"
  }
});

<Menu.Item className={menuItemClass} />
```

### 构建样式化组件

```typescript
import { cn } from "@xiaoa/ui";
import { Dialog } from "@base-ui/react/dialog";

export function StyledDialogPopup({ className, ...props }: Dialog.Popup.Props) {
  return (
    <Dialog.Popup
      className={cn("dialog-panel", className)}
      {...props}
    />
  );
}
```

## 主题系统

- 使用 TailwindCSS 4 `@theme` 指令定义 CSS 变量
- OKLCH 色彩空间（感知均匀）
- 暗色模式通过 prefers-color-scheme 媒体查询自动切换
- Token 文件：`src/styles/tokens.css`
- 组件样式：`src/styles/components.css`

### 可用 Token

```css
/* 色彩 */
var(--color-background)           /* 背景色 */
var(--color-foreground)            /* 前景色 */
var(--color-primary)               /* 主色 */
var(--color-secondary)             /* 次要色 */
var(--color-destructive)           /* 危险色 */
var(--color-muted)                 /* 柔和色 */
var(--color-border)                /* 边界色 */
var(--color-highlight)             /* 高亮色 */
var(--color-disabled)              /* 禁用色 */

/* 效果 */
var(--shadow-sm), var(--shadow), var(--shadow-md), var(--shadow-lg)

/* 圆角 */
var(--radius-sm), var(--radius), var(--radius-md), var(--radius-lg), var(--radius-xl)

/* 间距 */
var(--spacing-xs), var(--spacing-sm), var(--spacing-md), var(--spacing-lg), var(--spacing-xl)
```

## 工具函数

```typescript
import { cn, createStateClass, createVariants, mergeProps } from "@xiaoa/ui";

// cn() — 合并 className
cn("base-class", isActive && "active-class", props.className)

// createStateClass() — 创建状态响应式 className
const buttonClass = createStateClass({
  base: "btn-base",
  states: { disabled: "btn-disabled" }
});

// createVariants() — 创建变体
const variants = createVariants({
  primary: "btn-primary",
  secondary: "btn-secondary"
});

// mergeProps() — 合并 props（包含 className 和 style）
```

## 规范

- 所有组件通过 src/index.ts 统一导出
- 不要在 UI 组件中添加业务逻辑
- 不要直接引用内部路径，使用包导出
- Base UI 原语直接从 `@base-ui/react/<component>` 导入
- Peer dependencies：React 19, TailwindCSS 4

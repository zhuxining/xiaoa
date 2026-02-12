/**
 * Base UI 样式工具函数
 *
 * Base UI 组件通过 `className` prop 接受样式。
 * className 可以是字符串或函数：`(state) => string`
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cn } from "./utils";

/**
 * Base UI 组件状态类型
 *
 * Base UI 将状态对象传递给 className 函数，同时也在 DOM 上渲染为 `data-*` 属性。
 */
export interface BaseUIState {
	/** 组件被禁用 */
	disabled?: boolean;
	/** 组件被聚焦 */
	focused?: boolean;
	/** 菜单项/列表项被高亮 */
	highlighted?: boolean;
	/** 菜单项/列表项被选中 */
	selected?: boolean;
	/** 菜单/弹出层已打开 */
	open?: boolean;
	/** 鼠标悬停 */
	hovered?: boolean;
	/** 按钮被按下 */
	pressed?: boolean;
	/** 表单字段有错误 */
	invalid?: boolean;
	/** 表单字段必填 */
	required?: boolean;
	/** 弹出层动画开始状态 */
	startingStyle?: boolean;
	/** 弹出层动画结束状态 */
	endingStyle?: boolean;
}

/**
 * 创建状态响应式 className 函数
 *
 * @example
 * ```tsx
 * const menuItemClass = createStateClass({
 *   base: "menu-item",
 *   states: {
 *     highlighted: "bg-highlight",
 *     disabled: "opacity-50"
 *   }
 * })
 *
 * <Menu.Item className={menuItemClass} />
 * ```
 */
export function createStateClass(config: {
	base?: string;
	states?: Partial<Record<keyof BaseUIState, string>>;
}): (state: BaseUIState) => string {
	return (state: BaseUIState) => {
		const classes: string[] = [];
		if (config.base) {
			classes.push(config.base);
		}
		if (config.states) {
			for (const [key, value] of Object.entries(state)) {
				if (value && key in config.states) {
					const stateKey = key as keyof BaseUIState;
					const style = config.states[stateKey];
					if (style) classes.push(style);
				}
			}
		}
		return cn(...classes);
	};
}

/**
 * 创建变体样式类
 *
 * @example
 * ```tsx
 * const buttonVariants = createVariants({
 *   primary: "btn-primary",
 *   secondary: "btn-secondary",
 *   outline: "btn-outline"
 * })
 *
 * <Button className={buttonVariants[variant]} />
 * ```
 */
export function createVariants<T extends string>(
	variants: Record<T, string>,
): Record<T, string> {
	return variants;
}

/**
 * 合并 props，处理 className 和 style
 *
 * @example
 * ```tsx
 * const { className, ...props } = mergeProps({ className: "base" }, { className: "override" })
 * // className: "base override"
 * ```
 */
export function mergeProps<
	T extends { className?: string; style?: React.CSSProperties },
>(...props: (T | undefined)[]): T {
	const result: Record<string, unknown> = {};
	const styleParts: React.CSSProperties[] = [];
	const classNames: ClassValue[] = [];

	for (const prop of props) {
		if (!prop) continue;
		if (prop.style) {
			styleParts.push(prop.style);
		}
		if (prop.className) {
			classNames.push(prop.className);
		}
		Object.assign(result, prop);
	}

	if (styleParts.length > 0) {
		result.style = Object.assign({}, ...styleParts.reverse());
	}
	if (classNames.length > 0) {
		result.className = twMerge(clsx(classNames));
	}

	return result as T;
}

/**
 * Tailwind data 选择器辅助类型
 *
 * Base UI 使用 `data-*` 属性暴露状态，Tailwind 4 通过 `data-*` 语法选择。
 *
 * @example
 * ```tsx
 * // 这些是等效的
 * className="data-[highlighted]:bg-blue-500"
 * className="data-highlighted:bg-blue-500"
 * ```
 */
export type DataSelector<T extends string> = `data-[${T}]`;

/**
 * 常用的 Base UI data 属性选择器常量
 */
export const dataSelectors = {
	/** 菜单项高亮 */
	highlighted: "data-highlighted",
	/** 菜单项选中 */
	selected: "data-selected",
	/** 组件禁用 */
	disabled: "data-disabled",
	/** 菜单打开 */
	open: "data-open",
	/** 弹出层打开 */
	popupOpen: "data-popup-open",
	/** 鼠标悬停 */
	hovered: "data-hovered",
	/** 按钮按下 */
	pressed: "data-pressed",
	/** 无效状态 */
	invalid: "data-invalid",
} as const;

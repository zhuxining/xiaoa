/**
 * Theme utilities
 */

import type { ThemeColors, ThemeMode } from "./types";

/**
 * Get the effective theme mode (resolves "system" to actual mode)
 *
 * @param mode - The theme mode to resolve
 * @returns "light" or "dark" based on system preference if mode is "system"
 */
export function getEffectiveTheme(mode: ThemeMode): "light" | "dark" {
	if (mode !== "system") {
		return mode;
	}

	// Check system preference
	if (typeof window !== "undefined" && window.matchMedia) {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}

	// Default to light for non-browser environments
	return "light";
}

/**
 * Validate a theme color value (hex, rgb, rgba, hsl, hsla, or named color)
 */
export function isValidThemeColor(color: string): boolean {
	if (!color) return false;

	// Named colors
	if (/^[a-z]+$/i.test(color)) {
		return true;
	}

	// Hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
	if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
		return true;
	}

	// RGB/RGBA
	if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
		return true;
	}

	// HSL/HSLA
	if (
		/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(color)
	) {
		return true;
	}

	return false;
}

/**
 * Generate CSS variables from theme colors
 *
 * @param colors - Theme colors
 * @param prefix - CSS variable prefix (default: "--xiaoa")
 * @returns Object with CSS variable names and values
 */
export function generateCssVariables(
	colors: ThemeColors,
	prefix = "--xiaoa",
): Record<string, string> {
	return {
		[`${prefix}-background`]: colors.background,
		[`${prefix}-foreground`]: colors.foreground,
		[`${prefix}-primary`]: colors.primary,
		[`${prefix}-secondary`]: colors.secondary,
		[`${prefix}-accent`]: colors.accent,
		[`${prefix}-muted`]: colors.muted,
		[`${prefix}-border`]: colors.border,
	};
}

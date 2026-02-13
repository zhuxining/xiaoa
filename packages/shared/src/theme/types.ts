/**
 * Theme types
 */

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
	background: string;
	foreground: string;
	primary: string;
	secondary: string;
	accent: string;
	muted: string;
	border: string;
}

export interface Theme {
	mode: ThemeMode;
	colors: ThemeColors;
}

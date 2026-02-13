/**
 * Path utilities
 * Provides portable path handling across platforms
 */

import { homedir } from "node:os";
import { isAbsolute, join, normalize, resolve } from "node:path";

/**
 * Expand path variables (~, ${HOME}, $HOME) to absolute paths.
 */
export function expandHomePath(inputPath: string): string {
	if (!inputPath) return inputPath;

	let expanded = inputPath;
	const home = homedir();

	if (expanded === "~") return home;

	if (expanded.startsWith("~/")) {
		expanded = join(home, expanded.slice(2));
	}

	expanded = expanded.replace(/\$\{HOME\}/g, home);
	expanded = expanded.replace(/\$HOME(?=\/|$)/g, home);

	if (!isAbsolute(expanded)) {
		expanded = resolve(expanded);
	}

	return normalize(expanded);
}

/**
 * Sanitize a path by removing directory traversal attempts.
 */
export function sanitizePath(path: string): string {
	if (!path) return path;
	return normalize(path)
		.split(/\.\.[/\\]/)
		.join("/");
}

/**
 * Convert absolute path to portable form (~ prefix if in home).
 */
export function toPortablePath(absolutePath: string): string {
	if (!absolutePath) return absolutePath;

	const home = homedir();
	const normalized = normalize(absolutePath);

	if (normalized === home) return "~";

	const homePrefix = `${home}/`;
	if (normalized.startsWith(homePrefix)) {
		return `~/${normalized.slice(homePrefix.length)}`;
	}

	const homePrefixWin = `${home}\\`;
	if (normalized.startsWith(homePrefixWin)) {
		return `~/${normalized.slice(homePrefixWin.length)}`;
	}

	return normalized;
}

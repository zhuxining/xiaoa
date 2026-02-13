/**
 * Path utilities
 * Provides portable path handling across platforms
 */

import { homedir } from "node:os";
import { isAbsolute, join, normalize, resolve } from "node:path";

/**
 * Expand path variables (~, ${HOME}, $HOME) to absolute paths.
 *
 * @param inputPath - Path that may contain variables
 * @returns Absolute path with all variables expanded
 *
 * @example
 * expandPath('~')                    // '/Users/alice'
 * expandPath('~/Documents')          // '/Users/alice/Documents'
 * expandPath('${HOME}/projects')     // '/Users/alice/projects'
 * expandPath('/absolute/path')       // '/absolute/path' (unchanged)
 */
export function expandHomePath(inputPath: string): string {
	if (!inputPath) return inputPath;

	let expanded = inputPath;
	const home = homedir();

	// Handle ~ alone
	if (expanded === "~") {
		return home;
	}

	// Handle ~/ prefix
	if (expanded.startsWith("~/")) {
		expanded = join(home, expanded.slice(2));
	}

	// Handle ${HOME} and $HOME variables
	expanded = expanded.replace(/\$\{HOME\}/g, home);
	expanded = expanded.replace(/\$HOME(?=\/|$)/g, home);

	// If still not absolute, resolve from cwd
	if (!isAbsolute(expanded)) {
		expanded = resolve(expanded);
	}

	return normalize(expanded);
}

/**
 * Sanitize a path by removing directory traversal attempts.
 * Ensures the path doesn't escape its intended base directory.
 *
 * @param path - Path to sanitize
 * @returns Sanitized path with traversal sequences removed
 */
export function sanitizePath(path: string): string {
	if (!path) return path;

	// Remove ../ sequences and normalize
	return normalize(path)
		.split(/\.\.[/\\]/)
		.join("/");
}

/**
 * Check if a path contains unexpanded variables.
 */
export function hasPathVariables(path: string): boolean {
	if (!path) return false;
	const home = homedir();
	return path.startsWith("~") || path.includes(home) || path.includes("$HOME/");
}

/**
 * Convert absolute path to portable form (~ prefix if in home).
 *
 * @param absolutePath - Absolute path to convert
 * @returns Portable path with ~ prefix if in home directory
 *
 * @example
 * toPortablePath('/Users/alice')           // '~'
 * toPortablePath('/Users/alice/Documents') // '~/Documents'
 * toPortablePath('/var/log')               // '/var/log' (unchanged)
 */
export function toPortablePath(absolutePath: string): string {
	if (!absolutePath) return absolutePath;

	const home = homedir();
	const normalized = normalize(absolutePath);

	// Exact match with home directory
	if (normalized === home) {
		return "~";
	}

	// Path within home directory
	const homePrefix = `${home}/`;
	const homePrefixWin = `${home}\\`;

	if (normalized.startsWith(homePrefix)) {
		return `~/${normalized.slice(homePrefix.length)}`;
	}

	if (normalized.startsWith(homePrefixWin)) {
		return `~/${normalized.slice(homePrefixWin.length)}`;
	}

	// Path is outside home directory, keep as absolute
	return normalized;
}

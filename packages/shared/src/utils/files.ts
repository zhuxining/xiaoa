/**
 * File utilities
 * Provides file I/O operations with error handling
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";

/**
 * Strip UTF-8 BOM (Byte Order Mark) from a string.
 * BOM (\uFEFF) can appear when files are written by certain editors or tools
 * and causes JSON.parse() to fail with "Unexpected token" errors.
 */
export function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Parse a JSON string, stripping any leading UTF-8 BOM.
 * Use this instead of raw JSON.parse() for any content that may originate from a file.
 * @deprecated Use safeJsonParse from data.ts instead. This will be removed in v0.2.0.
 */
export function safeJsonParseFile(text: string): unknown {
	return JSON.parse(stripBom(text));
}

/**
 * Read and parse a JSON file, handling UTF-8 BOM transparently.
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data
 * @throws Error if file doesn't exist or contains invalid JSON
 */
export function readJsonFile<T = unknown>(filePath: string): T {
	const content = readFileSync(filePath, "utf-8");
	return JSON.parse(stripBom(content)) as T;
}

/**
 * Read and parse a JSON file, with type safety.
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data
 * @throws Error if file doesn't exist or contains invalid JSON
 */
export function readJsonFileSync<T = unknown>(filePath: string): T {
	return readJsonFile<T>(filePath);
}

/**
 * Atomically write a file by writing to a temp file then renaming.
 * This prevents partial writes from corrupting the file on crash/interrupt.
 * Uses write-to-temp-then-rename pattern which is atomic on POSIX systems.
 *
 * @param filePath - Target file path
 * @param data - String content to write
 */
export function writeJsonFile(filePath: string, data: unknown): void {
	const tmpPath = `${filePath}.tmp`;
	try {
		writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
		renameSync(tmpPath, filePath);
	} catch (error) {
		// Clean up temp file if rename failed
		try {
			unlinkSync(tmpPath);
		} catch {}
		throw error;
	}
}

/**
 * Ensure a directory exists, creating it if necessary.
 *
 * @param dirPath - Directory path to ensure
 * @param recursive - Create parent directories if needed (default: true)
 */
export function ensureDir(dirPath: string, recursive = true): void {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive });
	}
}

/**
 * Atomically write a text file.
 *
 * @param filePath - Target file path
 * @param data - String content to write
 */
export function atomicWriteFileSync(filePath: string, data: string): void {
	const tmpPath = `${filePath}.tmp`;
	try {
		writeFileSync(tmpPath, data, "utf-8");
		renameSync(tmpPath, filePath);
	} catch (error) {
		// Clean up temp file if rename failed
		try {
			unlinkSync(tmpPath);
		} catch {}
		throw error;
	}
}

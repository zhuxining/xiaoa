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
 */
export function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Read and parse a JSON file, handling UTF-8 BOM transparently.
 */
export function readJsonFile<T = unknown>(filePath: string): T {
	const content = readFileSync(filePath, "utf-8");
	return JSON.parse(stripBom(content)) as T;
}

/**
 * Atomically write a JSON file by writing to a temp file then renaming.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
	const tmpPath = `${filePath}.tmp`;
	try {
		writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
		renameSync(tmpPath, filePath);
	} catch (error) {
		try {
			unlinkSync(tmpPath);
		} catch {}
		throw error;
	}
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
export function ensureDir(dirPath: string, recursive = true): void {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive });
	}
}

/**
 * Atomically write a text file.
 */
export function atomicWriteFileSync(filePath: string, data: string): void {
	const tmpPath = `${filePath}.tmp`;
	try {
		writeFileSync(tmpPath, data, "utf-8");
		renameSync(tmpPath, filePath);
	} catch (error) {
		try {
			unlinkSync(tmpPath);
		} catch {}
		throw error;
	}
}

/**
 * Data transformation utilities
 */

import { defu } from "defu";

/** Deep merge two objects. Properties in source override target. */
export { defu as deepMerge };

/**
 * Safely parse JSON with a fallback value.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

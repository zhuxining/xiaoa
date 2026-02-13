/**
 * Data transformation utilities
 * Provides utilities for deep merging, default values, and safe JSON parsing
 */

/**
 * Deep merge two objects.
 * Properties in source will override properties in target.
 *
 * @param target - The target object
 * @param source - The source object with partial updates
 * @returns Merged object
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		const sourceValue = source[key];
		const targetValue = result[key as keyof T];

		if (
			typeof sourceValue === "object" &&
			sourceValue !== null &&
			!Array.isArray(sourceValue) &&
			typeof targetValue === "object" &&
			targetValue !== null &&
			!Array.isArray(targetValue)
		) {
			// Recursively merge nested objects
			(result as Record<string, unknown>)[key] = deepMerge(
				targetValue as Record<string, unknown>,
				sourceValue as Partial<Record<string, unknown>>,
			);
		} else {
			// Override with source value
			(result as Record<string, unknown>)[key] = sourceValue;
		}
	}

	return result;
}

/**
 * Create an object with default values applied.
 * Properties in data will override defaults.
 *
 * @param data - The partial data object
 * @param defaults - The default values
 * @returns Object with defaults applied
 */
export function withDefaults<T>(data: Partial<T>, defaults: T): T {
	return deepMerge(defaults, data);
}

/**
 * Safely parse JSON with a fallback value.
 *
 * @param json - JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed JSON or fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
	try {
		return JSON.parse(json) as T;
	} catch {
		return fallback;
	}
}

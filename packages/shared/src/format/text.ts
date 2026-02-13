/**
 * Text formatting utilities
 */

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const TB = GB * 1024;

/**
 * Format file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB", "512 KB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const absBytes = Math.abs(bytes);

	if (absBytes < KB) {
		return `${bytes} B`;
	}

	if (absBytes < MB) {
		return `${(bytes / KB).toFixed(1)} KB`;
	}

	if (absBytes < GB) {
		return `${(bytes / MB).toFixed(1)} MB`;
	}

	if (absBytes < TB) {
		return `${(bytes / GB).toFixed(1)} GB`;
	}

	return `${(bytes / TB).toFixed(1)} TB`;
}

/**
 * Truncate text to a maximum length, adding ellipsis if truncated
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated text
 */
export function truncateText(
	text: string,
	maxLength: number,
	suffix = "...",
): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize the first character of a string
 *
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
	if (!text) return text;
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case
 *
 * @param text - Text to convert
 * @returns Title case text
 */
export function toTitleCase(text: string): string {
	return text
		.toLowerCase()
		.split(/\s+/)
		.map((word) => capitalize(word))
		.join(" ");
}

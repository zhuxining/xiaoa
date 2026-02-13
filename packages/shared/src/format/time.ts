/**
 * Time formatting utilities
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Format a timestamp as relative time (e.g., "2 hours ago", "in 3 days")
 *
 * @param timestamp - The timestamp to format
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Relative time string
 */
export function formatRelativeTime(
	timestamp: number,
	now = Date.now(),
): string {
	const diff = now - timestamp;
	const absDiff = Math.abs(diff);
	const suffix = diff < 0 ? "from now" : "ago";

	if (absDiff < MINUTE) {
		const seconds = Math.floor(absDiff / SECOND);
		return seconds === 0
			? "just now"
			: `${seconds} second${seconds > 1 ? "s" : ""} ${suffix}`;
	}

	if (absDiff < HOUR) {
		const minutes = Math.floor(absDiff / MINUTE);
		return `${minutes} minute${minutes > 1 ? "s" : ""} ${suffix}`;
	}

	if (absDiff < DAY) {
		const hours = Math.floor(absDiff / HOUR);
		return `${hours} hour${hours > 1 ? "s" : ""} ${suffix}`;
	}

	if (absDiff < WEEK) {
		const days = Math.floor(absDiff / DAY);
		return `${days} day${days > 1 ? "s" : ""} ${suffix}`;
	}

	if (absDiff < MONTH) {
		const weeks = Math.floor(absDiff / WEEK);
		return `${weeks} week${weeks > 1 ? "s" : ""} ${suffix}`;
	}

	if (absDiff < YEAR) {
		const months = Math.floor(absDiff / MONTH);
		return `${months} month${months > 1 ? "s" : ""} ${suffix}`;
	}

	const years = Math.floor(absDiff / YEAR);
	return `${years} year${years > 1 ? "s" : ""} ${suffix}`;
}

/**
 * Format a timestamp as a localized date and time
 *
 * @param timestamp - The timestamp to format
 * @param locale - Locale for formatting (default: system locale)
 * @returns Formatted date string
 */
export function formatDateTime(timestamp: number, locale?: string): string {
	return new Date(timestamp).toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

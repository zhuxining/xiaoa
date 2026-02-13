/**
 * Time formatting utilities
 */

import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * Format a timestamp as relative time (e.g., "2 小时前")
 */
export function formatRelativeTime(timestamp: number): string {
	return formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });
}

/**
 * Format a timestamp as a localized date and time
 */
export function formatDateTime(timestamp: number): string {
	return format(timestamp, "PPpp", { locale: zhCN });
}

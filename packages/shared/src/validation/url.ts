/**
 * URL validation utilities
 */

/**
 * Validate HTTPS URL
 */
export function isValidHttpsUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Validate HTTP/HTTPS URL
 */
export function isValidHttpUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Validate WebSocket URL (ws:// or wss://)
 */
export function isValidWsUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "ws:" || parsed.protocol === "wss:";
	} catch {
		return false;
	}
}

/**
 * Validate Secure WebSocket URL (wss://)
 */
export function isValidWssUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "wss:";
	} catch {
		return false;
	}
}

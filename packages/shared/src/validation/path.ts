/**
 * Path validation utilities
 */

/**
 * Validate workspace ID format
 * Format: ws-{timestamp}
 */
export function isValidWorkspaceId(id: string): boolean {
	return /^ws-\d+$/.test(id);
}

/**
 * Validate session ID format
 * Format: session-{timestamp}
 */
export function isValidSessionId(id: string): boolean {
	return /^session-\d+$/.test(id);
}

/**
 * Validate message ID format
 * Format: msg-{timestamp}
 */
export function isValidMessageId(id: string): boolean {
	return /^msg-\d+$/.test(id);
}

/**
 * Validate project ID format
 * Format: proj-{timestamp}
 */
export function isValidProjectId(id: string): boolean {
	return /^proj-\d+$/.test(id);
}

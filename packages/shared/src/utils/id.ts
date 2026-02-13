/**
 * ID generation utilities
 * Provides consistent ID generation across the application
 */

/**
 * Generate a generic unique ID with prefix
 * Format: {prefix}-{timestamp}
 */
export function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a workspace ID
 * Format: ws-{timestamp}
 */
export function generateWorkspaceId(): string {
	return generateId("ws");
}

/**
 * Generate a session ID
 * Format: session-{timestamp}
 */
export function generateSessionId(): string {
	return generateId("session");
}

/**
 * Generate a message ID
 * Format: msg-{timestamp}
 */
export function generateMessageId(): string {
	return generateId("msg");
}

/**
 * Generate a project ID
 * Format: proj-{timestamp}
 */
export function generateProjectId(): string {
	return generateId("proj");
}

/**
 * Generate a memory ID
 * Format: mem-{timestamp}
 */
export function generateMemoryId(): string {
	return generateId("mem");
}

/**
 * Generate a knowledge ID
 * Format: kn-{timestamp}
 */
export function generateKnowledgeId(): string {
	return generateId("kn");
}

/**
 * Generate a skill ID
 * Format: sk-{timestamp}
 */
export function generateSkillId(): string {
	return generateId("sk");
}

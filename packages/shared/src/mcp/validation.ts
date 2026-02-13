/**
 * MCP validation utilities
 */

import type { McpServerConfig, McpTransport } from "./types";

/**
 * Validate MCP server configuration
 */
export function validateMcpConfig(config: McpServerConfig): boolean {
	// Name is required
	if (!config.name || config.name.trim().length === 0) {
		return false;
	}

	// Transport is required
	if (!config.transport) {
		return false;
	}

	// Validate transport-specific requirements
	switch (config.transport) {
		case "http":
		case "sse":
			// endpoint is required for http/sse
			if (!config.endpoint) {
				return false;
			}
			// Validate URL format
			try {
				new URL(config.endpoint);
			} catch {
				return false;
			}
			break;

		case "stdio":
			// command is required for stdio
			if (!config.command) {
				return false;
			}
			break;
	}

	return true;
}

/**
 * Generate MCP server unique ID from name
 */
export function generateMcpServerId(name: string): string {
	// Remove special characters and spaces, convert to lowercase
	const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return `mcp-${sanitized}-${Date.now()}`;
}

/**
 * Check if transport type is valid
 */
export function isValidMcpTransport(
	transport: string,
): transport is McpTransport {
	return ["http", "sse", "stdio"].includes(transport);
}

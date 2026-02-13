/**
 * MCP validation utilities
 */

import { z } from "zod";
import type { McpTransport } from "./types";

const mcpTransportSchema = z.enum(["http", "sse", "stdio"]);

const baseMcpConfigSchema = z.object({
	name: z.string().min(1).trim(),
	transport: mcpTransportSchema,
	endpoint: z.url().optional(),
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional(),
	enabled: z.boolean().optional(),
});

const mcpConfigSchema = baseMcpConfigSchema.superRefine((config, ctx) => {
	if (config.transport === "http" || config.transport === "sse") {
		if (!config.endpoint) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "endpoint is required for http/sse transport",
				path: ["endpoint"],
			});
		}
	}
	if (config.transport === "stdio") {
		if (!config.command) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "command is required for stdio transport",
				path: ["command"],
			});
		}
	}
});

/**
 * Validate MCP server configuration
 */
export function validateMcpConfig(
	config: z.input<typeof baseMcpConfigSchema>,
): boolean {
	return mcpConfigSchema.safeParse(config).success;
}

/**
 * Generate MCP server unique ID from name
 */
export function generateMcpServerId(name: string): string {
	const sanitized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return `mcp-${sanitized}-${Date.now()}`;
}

/**
 * Check if transport type is valid
 */
export function isValidMcpTransport(
	transport: string,
): transport is McpTransport {
	return mcpTransportSchema.safeParse(transport).success;
}

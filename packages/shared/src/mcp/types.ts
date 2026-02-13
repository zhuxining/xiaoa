/**
 * MCP (Model Context Protocol) types
 */

export type McpTransport = "http" | "sse" | "stdio";

export interface McpServerConfig {
	name: string;
	transport: McpTransport;
	endpoint?: string;
	command?: string;
	args?: string[];
	env?: Record<string, string>;
	enabled?: boolean;
}

export interface McpServerConfigWithId extends McpServerConfig {
	id: string;
}

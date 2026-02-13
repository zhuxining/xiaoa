import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import type { LLMConfig, StreamEvent } from "@xiaoa/types";
import { BrowserWindow } from "electron";
import { sessionService } from "./sessions";
import { storage } from "./storage";

// Provider configurations
const PROVIDER_CONFIGS = {
	anthropic: {
		baseUrl: "https://api.anthropic.com",
		defaultModel: "claude-sonnet-4-20250514",
		streamSupport: true,
	},
	openai: {
		baseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-4o",
		streamSupport: true,
	},
	ollama: {
		baseUrl: "http://localhost:11434",
		defaultModel: "llama3.2",
		streamSupport: true,
	},
	custom: {
		baseUrl: "",
		defaultModel: "",
		streamSupport: true,
	},
} as const;

// Active agent instances per session
const agentInstances = new Map<string, Agent>();

// Abort controllers for streaming
const abortControllers = new Map<string, AbortController>();

export interface StreamOptions {
	model?: string;
	temperature?: number;
	maxTokens?: number;
}

export function getAvailableModels(provider: LLMConfig["provider"]): string[] {
	const config = PROVIDER_CONFIGS[provider];
	if (!config) return [];
	return [config.defaultModel];
}

export async function streamChat(
	workspaceId: string,
	sessionId: string,
	messages: Array<{ role: string; content: string }>,
	_options: StreamOptions,
): Promise<void> {
	const workspace = storage.getWorkspace(workspaceId);
	if (!workspace) {
		throw new Error(`Workspace not found: ${workspaceId}`);
	}

	const globalConfig = storage.getConfig();
	const llmConfig = workspace.agent.model
		? {
				provider: "custom" as const,
				model: workspace.agent.model,
				apiKey: globalConfig.llm.apiKey,
			}
		: globalConfig.llm;

	const providerConfig = PROVIDER_CONFIGS[llmConfig.provider];
	if (!providerConfig) {
		throw new Error(`Unsupported provider: ${llmConfig.provider}`);
	}

	// Create or get existing agent for this session
	let agent = agentInstances.get(sessionId);

	// Build context messages
	const contextMessages = messages.map((m) => ({
		role: m.role as "user" | "assistant" | "toolResult",
		content: [{ type: "text" as const, text: m.content }],
		timestamp: Date.now(),
	}));

	if (!agent) {
		// Get model from pi-ai
		const model = getModel(llmConfig.provider, llmConfig.model);

		// Create new agent
		agent = new Agent({
			initialState: {
				systemPrompt: workspace.agent.systemPrompt,
				model,
				messages: contextMessages,
				thinkingLevel: "minimal",
			},
		});
		agentInstances.set(sessionId, agent);
	} else {
		// Update existing agent with new messages
		agent.replaceMessages(contextMessages);
		agent.setSystemPrompt(workspace.agent.systemPrompt);
	}

	// Create abort controller for this request
	const controller = new AbortController();
	abortControllers.set(sessionId, controller);

	// Subscribe to agent events
	const unsubscribe = agent.subscribe((event) => {
		const win = BrowserWindow.getAllWindows()[0];
		if (!win) return;

		// Map agent events to our StreamEvent format
		let streamEvent: StreamEvent | null = null;

		switch (event.type) {
			case "agent_start":
				// Initial state
				break;
			case "turn_start":
				// New turn started
				break;
			case "message_start":
				if (event.message.role === "assistant") {
					streamEvent = {
						type: "text_start",
						sessionId,
						content: "",
					};
				}
				break;
			case "message_update":
				if (event.assistantMessageEvent) {
					const { type: eventType, delta } = event.assistantMessageEvent;

					if (eventType === "text_delta") {
						streamEvent = {
							type: "text_delta",
							sessionId,
							content: delta,
						};
					} else if (eventType === "tool_call_start") {
						streamEvent = {
							type: "tool_call",
							sessionId,
							toolCall: {
								id: delta.id || "",
								name: delta.name || "",
								arguments: delta.arguments || {},
							},
						};
					}
				}
				break;
			case "message_end":
				if (event.message.role === "assistant") {
					streamEvent = {
						type: "text_end",
						sessionId,
						content: extractTextContent(event.message),
					};

					// Save assistant message to storage
					const content = extractTextContent(event.message);
					if (content) {
						sessionService.addAssistantMessage(workspaceId, sessionId, content);
					}
				}
				break;
			case "turn_end":
				// Turn completed
				break;
			case "agent_end":
				streamEvent = {
					type: "done",
					sessionId,
				};
				break;
			case "error":
				streamEvent = {
					type: "error",
					sessionId,
					error: event.error?.message || "Unknown error",
				};
				break;
		}

		if (streamEvent) {
			win.webContents.send("chat:streamEvent", streamEvent);
		}
	});

	try {
		// Start the agent prompt
		// Get the last user message to prompt
		const lastUserMessage = messages[messages.length - 1];
		if (lastUserMessage && lastUserMessage.role === "user") {
			await agent.prompt(lastUserMessage.content, {
				signal: controller.signal,
			});
		}
	} catch (error) {
		const win = BrowserWindow.getAllWindows()[0];
		if (win) {
			win.webContents.send("chat:streamEvent", {
				type: "error",
				sessionId,
				error: error instanceof Error ? error.message : String(error),
			} as StreamEvent);
		}
	} finally {
		unsubscribe();
		abortControllers.delete(sessionId);
	}
}

export function abortChat(sessionId: string): void {
	const controller = abortControllers.get(sessionId);
	if (controller) {
		controller.abort();
		abortControllers.delete(sessionId);
	}
}

// Helper to extract text content from agent message
function extractTextContent(message: {
	role: string;
	content: Array<{ type: string; text?: string }>;
}): string {
	return message.content
		.filter((block) => block.type === "text")
		.map((block) => block.text || "")
		.join("");
}

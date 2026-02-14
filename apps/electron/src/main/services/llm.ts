import {
	Agent,
	type AssistantMessage,
	getModel,
	type UserMessage,
} from "@xiaoa/shared";
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
} as const;

export function getAvailableModels(provider: LLMConfig["provider"]): string[] {
	const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
	if (!config) return [];
	return [config.defaultModel];
}

// Active agent instances per session
const agentInstances = new Map<string, Agent>();

// Abort controllers for streaming
const abortControllers = new Map<string, AbortController>();

export async function streamChat(
	workspaceId: string,
	sessionId: string,
	messages: Array<{ role: string; content: string }>,
	_options: Record<string, unknown>,
): Promise<void> {
	const workspace = storage.getWorkspace(workspaceId);
	if (!workspace) {
		throw new Error(`Workspace not found: ${workspaceId}`);
	}

	const globalConfig = storage.getConfig();
	// Get provider, default to anthropic if workspace has model, otherwise use global config
	const providerValue = workspace.agent.model
		? "anthropic"
		: globalConfig.llm.provider;
	// Filter to only supported providers by pi-ai
	const provider =
		providerValue === "custom" || providerValue === "ollama"
			? "openai"
			: providerValue;
	const modelId = workspace.agent.model || globalConfig.llm.model;

	const model = getModel(
		provider as "anthropic" | "openai" | "openrouter",
		modelId as never,
	);

	// Create or get existing agent for this session
	let agent = agentInstances.get(sessionId);

	// Build context messages - convert to pi-agent format
	const contextMessages: Array<UserMessage | AssistantMessage> = messages.map(
		(m) => ({
			role: "user",
			content: m.content,
			timestamp: Date.now(),
		}),
	);

	if (!agent) {
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
					const { type: eventType } = event.assistantMessageEvent;

					if (eventType === "text_delta") {
						const e = event.assistantMessageEvent as { delta: string };
						streamEvent = {
							type: "text_delta",
							sessionId,
							content: e.delta,
						};
					} else if (eventType === "toolcall_start") {
						const eventData = event.assistantMessageEvent as unknown;
						const toolCallData = (
							eventData as {
								toolCall: { id: string; name: string };
							}
						).toolCall;
						streamEvent = {
							type: "tool_call",
							sessionId,
							toolCall: {
								id: toolCallData.id,
								name: toolCallData.name,
								arguments: {},
							},
						};
					}
				}
				break;
			case "message_end":
				if (event.message.role === "assistant") {
					const content = extractTextContent(event.message);
					streamEvent = {
						type: "text_end",
						sessionId,
						content,
					};

					// Save assistant message to storage
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
			await agent.prompt(lastUserMessage.content);
		}
	} catch (error) {
		const win = BrowserWindow.getAllWindows()[0];
		if (win) {
			win.webContents.send("chat:streamEvent", {
				type: "done" as "error",
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
function extractTextContent(message: AssistantMessage): string {
	return message.content
		.filter((block) => block.type === "text")
		.map((block) => (block as { text?: string }).text || "")
		.join("");
}

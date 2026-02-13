import type { StreamEvent } from "@xiaoa/types";
import { atom } from "jotai";

export interface StreamingStatus {
	isStreaming: boolean;
	currentContent: string;
	pendingToolCalls: Array<{ id: string; name: string }>;
	error?: string;
}

export const streamingStatusAtom = atom<Record<string, StreamingStatus>>({});

export const updateStreamingStatusAtom = atom(
	null,
	(get, set) => (sessionId: string, event: StreamEvent) => {
		const current = get(streamingStatusAtom);
		const status = current[sessionId] || {
			isStreaming: false,
			currentContent: "",
			pendingToolCalls: [],
		};

		let updated: StreamingStatus;

		switch (event.type) {
			case "text_start":
				updated = {
					...status,
					isStreaming: true,
					currentContent: "",
					error: undefined,
				};
				break;
			case "text_delta":
				updated = {
					...status,
					isStreaming: true,
					currentContent: status.currentContent + (event.content || ""),
				};
				break;
			case "text_end":
				updated = {
					...status,
					isStreaming: true,
					currentContent: status.currentContent,
				};
				break;
			case "done":
				updated = { ...status, isStreaming: false };
				break;
			case "error":
				updated = { ...status, isStreaming: false, error: event.error };
				break;
			case "tool_call":
				if (event.toolCall) {
					updated = {
						...status,
						pendingToolCalls: [
							...status.pendingToolCalls,
							{
								id: event.toolCall.id,
								name: event.toolCall.name,
							},
						],
					};
				} else {
					updated = status;
				}
				break;
			default:
				updated = status;
		}

		set(streamingStatusAtom, { ...current, [sessionId]: updated });
	},
);

export const clearStreamingStatusAtom = atom(
	null,
	(get, set) => (sessionId: string) => {
		const current = get(streamingStatusAtom);
		const { [sessionId]: _, ...rest } = current;
		set(streamingStatusAtom, rest);
	},
);

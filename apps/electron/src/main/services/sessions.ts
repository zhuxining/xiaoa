import type { Message, Session } from "@xiaoa/types";
import { storage } from "./storage";

export interface SendMessageParams {
	message: string;
	sessionId: string;
	attachments?: Array<{ name: string; path: string }>;
	invokedSkillId?: string;
}

export class SessionService {
	// Get or create a session for a workspace
	getOrCreateSession(workspaceId: string, sessionId: string): Session {
		let session = storage.getSession(workspaceId, sessionId);
		if (!session) {
			session = {
				id: sessionId,
				projectId: null,
				title: "New Chat",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
			storage.createSession(workspaceId, session);
		}
		return session;
	}

	// Get messages for a session
	getMessages(workspaceId: string, sessionId: string): Message[] {
		return storage.getMessages(workspaceId, sessionId);
	}

	// Add a user message
	addUserMessage(
		workspaceId: string,
		sessionId: string,
		content: string,
		attachments?: Message["attachments"],
	): Message {
		const message: Message = {
			id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
			sessionId,
			role: "user",
			content,
			timestamp: Date.now(),
			attachments,
		};
		storage.createMessage(workspaceId, sessionId, message);
		return message;
	}

	// Add an assistant message
	addAssistantMessage(
		workspaceId: string,
		sessionId: string,
		content: string,
	): Message {
		const message: Message = {
			id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
			sessionId,
			role: "assistant",
			content,
			timestamp: Date.now(),
		};
		storage.createMessage(workspaceId, sessionId, message);
		return message;
	}

	// Update session title based on first message
	updateSessionTitle(
		workspaceId: string,
		sessionId: string,
		firstMessage: string,
	): void {
		const session = storage.getSession(workspaceId, sessionId);
		if (session && session.title === "New Chat") {
			const title =
				firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
			storage.updateSession(workspaceId, {
				...session,
				title,
				updatedAt: Date.now(),
			});
		}
	}
}

// Singleton instance
let sessionServiceInstance: SessionService | null = null;

export function getSessionService(): SessionService {
	if (!sessionServiceInstance) {
		sessionServiceInstance = new SessionService();
	}
	return sessionServiceInstance;
}

export const sessionService = getSessionService();

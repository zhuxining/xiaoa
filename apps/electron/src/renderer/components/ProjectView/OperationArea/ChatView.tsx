import { useAtomValue } from "jotai";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import {
	activeWorkspaceIdAtom,
	messagesAtom,
	updateStreamingStatusAtom,
} from "../../../atoms";
import { MessageInput, StreamingMessage } from "../../../components/Chat";

export function ChatView() {
	const messages = useAtomValue(messagesAtom);
	const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
	const updateStreamingStatus = useAtomValue(
		updateStreamingStatusAtom,
	) as unknown as (
		sessionId: string,
		event: import("@xiaoa/types").StreamEvent,
	) => void;

	useEffect(() => {
		const cleanup = window.electronAPI.chat.onStreamEvent((event) => {
			updateStreamingStatus(event.sessionId, event);
		});
		return cleanup;
	}, [updateStreamingStatus]);

	const handleSend = async (message: string) => {
		if (!activeWorkspaceId) return;

		const sessionId = "default";

		await window.electronAPI.chat.send({
			workspaceId: activeWorkspaceId,
			message,
			sessionId,
		});
	};

	return (
		<div className="flex-1 flex flex-col">
			<div className="flex-1 overflow-auto p-4">
				{messages.length === 0 && (
					<div className="flex items-center justify-center h-full text-muted-foreground">
						<p>🐣 你好！我是小A，有什么我可以帮助你的吗？</p>
					</div>
				)}
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}
					>
						<div
							className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
								msg.role === "user"
									? "bg-primary text-primary-foreground"
									: "bg-muted"
							}`}
						>
							{msg.role === "assistant" ? (
								<div className="prose prose-sm dark:prose-invert max-w-none">
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										components={{
											code(props) {
												const { className, children } = props as {
													className?: string;
													children?: unknown;
												};
												const language =
													className?.replace("language-", "") || "text";
												return (
													<SyntaxHighlighter
														style={oneDark}
														language={language}
														PreTag="div"
													>
														{String(children).replace(/\n$/, "")}
													</SyntaxHighlighter>
												);
											},
										}}
									>
										{msg.content}
									</ReactMarkdown>
								</div>
							) : (
								msg.content
							)}
						</div>
					</div>
				))}
				{activeWorkspaceId && (
					<StreamingMessage sessionId={activeWorkspaceId} />
				)}
			</div>

			<MessageInput onSend={handleSend} />
		</div>
	);
}

import { cn } from "@xiaoa/ui";
import { useAtomValue } from "jotai";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { streamingStatusAtom } from "../../atoms";

interface StreamingMessageProps {
	sessionId: string;
}

export function StreamingMessage({ sessionId }: StreamingMessageProps) {
	const streamingStatus = useAtomValue(streamingStatusAtom);
	const status = streamingStatus[sessionId];

	if (!status || !status.isStreaming) return null;

	return (
		<div className="mb-4">
			<div className="inline-block px-4 py-2 bg-primary/10 rounded-lg max-w-[80%]">
				<div className="flex items-start gap-2">
					<span className="text-xs text-muted-foreground">Assistant</span>
					<div className="flex-1 space-y-1">
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								components={{
									code({ node, inline, className, children, ...props }) {
										const match = /language-(\w+)/.exec(className || "");
										return !inline ? (
											<SyntaxHighlighter
												style={oneDark}
												language={match?.[1] || "text"}
												PreTag="div"
												{...props}
											>
												{String(children).replace(/\n$/, "")}
											</SyntaxHighlighter>
										) : (
											<code
												className={cn(
													"px-1 py-0.5 rounded bg-muted text-muted-foreground text-sm",
													className,
												)}
												{...props}
											>
												{children}
											</code>
										);
									},
								}}
							>
								{status.currentContent}
							</ReactMarkdown>
						</div>
						<span className="inline-block w-2 h-4 animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}

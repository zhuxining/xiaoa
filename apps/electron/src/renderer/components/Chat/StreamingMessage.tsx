import { Markdown } from "@xiaoa/ui";
import { useAtomValue } from "jotai";
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
						<Markdown>{status.currentContent}</Markdown>
						<span className="inline-block w-2 h-4 animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}

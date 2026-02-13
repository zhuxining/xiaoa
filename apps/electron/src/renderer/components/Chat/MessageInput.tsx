import { cn } from "@xiaoa/ui";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { activeWorkspaceIdAtom, streamingStatusAtom } from "../../atoms";
import { SkillMentionMenu } from "./SkillMentionMenu";

interface MessageInputProps {
	onSend: (message: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
	const [input, setInput] = useState("");
	const [showSkillMenu, setShowSkillMenu] = useState(false);
	const [skillQuery, setSkillQuery] = useState("");
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
	const streamingStatus = useAtomValue(streamingStatusAtom);

	const isStreaming =
		activeWorkspaceId && streamingStatus[activeWorkspaceId]?.isStreaming;

	const handleSend = () => {
		if (!input.trim() || isStreaming) return;
		onSend(input);
		setInput("");
		setSkillQuery("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		} else if (e.key === "/" && input === "") {
			setShowSkillMenu(true);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
		if (e.target.value.startsWith("/")) {
			setSkillQuery(e.target.value.slice(1));
		} else {
			setSkillQuery("");
			setShowSkillMenu(false);
		}
	};

	return (
		<div className="p-4 border-t">
			<div className="flex gap-2">
				<div className="flex-1 relative">
					<textarea
						ref={inputRef}
						value={input}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder="输入消息... (/@ 引用文件, / 调用技能)"
						className="input-base w-full resize-none"
						rows={1}
						disabled={!!isStreaming}
					/>

					{showSkillMenu && (
						<SkillMentionMenu
							query={skillQuery}
							onSelect={(skill) => {
								setInput(`/${skill.name} `);
								setShowSkillMenu(false);
								inputRef.current?.focus();
							}}
						/>
					)}
				</div>

				<button
					type="button"
					onClick={handleSend}
					disabled={!input.trim() || !!isStreaming}
					className={cn("btn-primary px-4", isStreaming && "opacity-50")}
				>
					{isStreaming ? "..." : "发送"}
				</button>
			</div>
		</div>
	);
}

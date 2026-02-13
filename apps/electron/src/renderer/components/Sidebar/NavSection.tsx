import { useAtom, useAtomValue } from "jotai";
import { activeViewAtom, activeWorkspaceIdAtom } from "../../atoms";

const navItems = [
	{ type: "agent" as const, icon: "🤖", label: "Agent" },
	{ type: "skills" as const, icon: "⚡", label: "技能" },
	{ type: "memories" as const, icon: "🧠", label: "记忆" },
	{ type: "knowledge" as const, icon: "📚", label: "知识库" },
];

export function NavSection() {
	const [activeView, setActiveView] = useAtom(activeViewAtom);
	const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);

	if (!activeWorkspaceId) return null;

	return (
		<div className="flex-1 overflow-auto py-2 border-b border-border">
			{navItems.map((item) => (
				<button
					type="button"
					key={item.type}
					onClick={() => setActiveView({ type: item.type })}
					className={`w-full px-3 py-2 text-left text-sm transition-colors ${
						activeView.type === item.type
							? "bg-muted text-foreground"
							: "hover:bg-muted/50"
					}`}
				>
					<span className="mr-2">{item.icon}</span>
					{item.label}
				</button>
			))}
		</div>
	);
}

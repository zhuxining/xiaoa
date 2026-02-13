import { useAtomValue } from "jotai";
import { sessionsAtom } from "../../atoms";

export function XiaoASessionList() {
	const sessions = useAtomValue(sessionsAtom);

	return (
		<div className="w-56 border-r border-border overflow-auto">
			<div className="p-2 border-b border-border">
				<button type="button" className="w-full btn-primary text-sm py-1">
					+ 新会话
				</button>
			</div>
			{sessions.map((session) => (
				<button
					type="button"
					key={session.id}
					className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
				>
					💬 {session.title}
				</button>
			))}
			{sessions.length === 0 && (
				<p className="px-3 text-sm text-muted-foreground">暂无会话</p>
			)}
		</div>
	);
}

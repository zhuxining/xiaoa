import { useAtomValue } from "jotai";
import { activeWorkspaceIdAtom, workspacesAtom } from "../../atoms";

export function WorkspaceSwitcher() {
	const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);
	const workspaces = useAtomValue(workspacesAtom);

	const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

	return (
		<div className="px-3 py-2 border-b border-border">
			<button
				type="button"
				className="w-full flex items-center justify-between text-sm"
			>
				<span className="font-medium">
					{activeWorkspace?.name || "无工作区"}
				</span>
				<span className="text-muted-foreground">▾</span>
			</button>
		</div>
	);
}

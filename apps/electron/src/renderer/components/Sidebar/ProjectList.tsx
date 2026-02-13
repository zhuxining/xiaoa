import { useAtomValue } from "jotai";
import { activeWorkspaceIdAtom } from "../../atoms";

export function ProjectList() {
	const activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);

	if (!activeWorkspaceId) {
		return (
			<div className="flex-1 overflow-auto py-2">
				<p className="px-3 text-sm text-muted-foreground">请先选择工作区</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-auto py-2">
			<p className="px-3 text-sm text-muted-foreground">项目列表 (待实现)</p>
		</div>
	);
}

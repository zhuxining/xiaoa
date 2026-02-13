import { useAtom } from "jotai";
import { useEffect } from "react";
import { activeWorkspaceAtom, memoriesAtom } from "../../atoms";

export function MemoriesManager() {
	const [activeWorkspace] = useAtom(activeWorkspaceAtom);
	const [memories, setMemories] = useAtom(memoriesAtom);

	useEffect(() => {
		if (activeWorkspace) {
			window.electronAPI.memory.getAll(activeWorkspace.id).then(setMemories);
		}
	}, [activeWorkspace, setMemories]);

	if (!activeWorkspace) return <div>请选择工作区</div>;

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">记忆管理</h1>
				<button
					type="button"
					className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
				>
					新建记忆
				</button>
			</div>

			<div className="space-y-2">
				{memories.map((memory) => (
					<div
						key={memory.id}
						className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1">
								<h3 className="font-medium">{memory.category}</h3>
								<p className="text-sm text-gray-500 line-clamp-2">
									{memory.content}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs px-2 py-1 bg-gray-200 rounded">
									{memory.priority}
								</span>
								<span className="text-xs text-gray-400">
									引用: {memory.refs}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

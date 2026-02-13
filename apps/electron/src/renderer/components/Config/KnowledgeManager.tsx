import { useAtom } from "jotai";
import { useEffect } from "react";
import { activeWorkspaceAtom, knowledgeAtom } from "../../atoms";

export function KnowledgeManager() {
	const [activeWorkspace] = useAtom(activeWorkspaceAtom);
	const [knowledge, setKnowledge] = useAtom(knowledgeAtom);

	useEffect(() => {
		if (activeWorkspace) {
			window.electronAPI.knowledge
				.getAll(activeWorkspace.id)
				.then(setKnowledge);
		}
	}, [activeWorkspace, setKnowledge]);

	if (!activeWorkspace) return <div>请选择工作区</div>;

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">知识库管理</h1>
				<div className="flex gap-2">
					<button
						type="button"
						className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
					>
						添加本地文件
					</button>
					<button
						type="button"
						className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
					>
						添加 URL
					</button>
				</div>
			</div>

			<div className="space-y-2">
				{knowledge.map((item) => (
					<div
						key={item.id}
						className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1">
								<h3 className="font-medium">{item.name}</h3>
								<p className="text-sm text-gray-500">{item.description}</p>
								<div className="flex gap-2 mt-2">
									<span className="text-xs px-2 py-1 bg-gray-200 rounded">
										{item.source}
									</span>
									<span className="text-xs px-2 py-1 bg-gray-200 rounded">
										{item.status}
									</span>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

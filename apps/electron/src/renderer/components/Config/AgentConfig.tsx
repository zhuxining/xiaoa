import { useAtom } from "jotai";
import { activeWorkspaceAtom } from "../../atoms";

export function AgentConfig() {
	const [activeWorkspace] = useAtom(activeWorkspaceAtom);

	if (!activeWorkspace) return <div>请选择工作区</div>;

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-6">Agent 配置</h1>

			<div className="space-y-4">
				<div>
					<label
						htmlFor="agent-name"
						className="block text-sm font-medium mb-2"
					>
						名称
					</label>
					<input
						id="agent-name"
						type="text"
						defaultValue={activeWorkspace.agent.name}
						className="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div>
					<label
						htmlFor="agent-prompt"
						className="block text-sm font-medium mb-2"
					>
						系统提示
					</label>
					<textarea
						id="agent-prompt"
						defaultValue={activeWorkspace.agent.systemPrompt}
						rows={6}
						className="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div>
					<label
						htmlFor="agent-model"
						className="block text-sm font-medium mb-2"
					>
						模型
					</label>
					<input
						id="agent-model"
						type="text"
						defaultValue={activeWorkspace.agent.model}
						className="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div>
					<label
						htmlFor="agent-temp"
						className="block text-sm font-medium mb-2"
					>
						温度
					</label>
					<input
						id="agent-temp"
						type="number"
						defaultValue={activeWorkspace.agent.temperature ?? 0.7}
						step="0.1"
						min="0"
						max="1"
						className="w-full px-3 py-2 border rounded-md"
					/>
				</div>

				<div className="pt-4">
					<button
						type="button"
						className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
					>
						保存
					</button>
				</div>
			</div>
		</div>
	);
}

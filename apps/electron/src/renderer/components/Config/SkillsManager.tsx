import { useAtom } from "jotai";
import { useEffect } from "react";
import { activeWorkspaceAtom, skillsAtom } from "../../atoms";

export function SkillsManager() {
	const [activeWorkspace] = useAtom(activeWorkspaceAtom);
	const [skills, setSkills] = useAtom(skillsAtom);

	useEffect(() => {
		if (activeWorkspace) {
			window.electronAPI.skill.getAll(activeWorkspace.id).then(setSkills);
		}
	}, [activeWorkspace, setSkills]);

	if (!activeWorkspace) return <div>请选择工作区</div>;

	return (
		<div className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">技能管理</h1>
				<button
					type="button"
					className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
				>
					新建技能
				</button>
			</div>

			<div className="space-y-2">
				{skills.map((skill) => (
					<div
						key={skill.name}
						className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
					>
						<div className="flex items-center gap-3">
							{skill.icon && <span className="text-2xl">{skill.icon}</span>}
							<div className="flex-1">
								<h3 className="font-medium">{skill.name}</h3>
								<p className="text-sm text-gray-500">{skill.description}</p>
							</div>
							<span className="text-xs px-2 py-1 bg-gray-200 rounded">
								{skill.invocation}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

import { useAtom } from "jotai";
import { activeViewAtom } from "../atoms";
import { AgentConfig } from "./Config/AgentConfig";
import { KnowledgeManager } from "./Config/KnowledgeManager";
import { MemoriesManager } from "./Config/MemoriesManager";
import { SkillsManager } from "./Config/SkillsManager";
import { SettingsPage } from "./Settings";
import { Sidebar } from "./Sidebar";
import { XiaoAView } from "./XiaoAView";

export function MainLayout() {
	const [activeView] = useAtom(activeViewAtom);

	return (
		<div className="flex h-screen">
			<Sidebar />
			<main className="flex-1 overflow-auto">
				{activeView.type === "xiaoa" && <XiaoAView />}
				{activeView.type === "agent" && <AgentConfig />}
				{activeView.type === "skills" && <SkillsManager />}
				{activeView.type === "memories" && <MemoriesManager />}
				{activeView.type === "knowledge" && <KnowledgeManager />}
				{activeView.type === "settings" && <SettingsPage />}
				{/* Project 视图在后续步骤添加 */}
			</main>
		</div>
	);
}

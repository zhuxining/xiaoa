import { useAtom, useAtomValue } from "jotai";
import {
	activeViewAtom,
	activeWorkspaceIdAtom,
	workspacesAtom,
} from "../../atoms";
import { NavSection } from "./NavSection";
import { ProjectList } from "./ProjectList";
import { SettingsEntry } from "./SettingsEntry";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { XiaoAEntry } from "./XiaoAEntry";

export function Sidebar() {
	const [_activeView, _setActiveView] = useAtom(activeViewAtom);
	const _workspaces = useAtomValue(workspacesAtom);
	const _activeWorkspaceId = useAtomValue(activeWorkspaceIdAtom);

	return (
		<aside className="w-52 bg-muted/30 flex flex-col border-r border-border">
			<XiaoAEntry />
			<WorkspaceSwitcher />
			<NavSection />
			<ProjectList />
			<SettingsEntry />
		</aside>
	);
}

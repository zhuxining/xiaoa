import { useAtom } from "jotai";
import { activeViewAtom } from "../../atoms";

export function SettingsEntry() {
	const [activeView, setActiveView] = useAtom(activeViewAtom);

	return (
		<button
			type="button"
			onClick={() => setActiveView({ type: "settings" })}
			className={`p-3 text-left text-sm transition-colors border-t border-border ${
				activeView.type === "settings"
					? "bg-muted text-foreground"
					: "hover:bg-muted/50"
			}`}
		>
			⚙️ 设置
		</button>
	);
}

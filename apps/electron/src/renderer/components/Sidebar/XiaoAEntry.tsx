import { useAtom } from "jotai";
import { activeViewAtom } from "../../atoms";

export function XiaoAEntry() {
	const [activeView, setActiveView] = useAtom(activeViewAtom);

	return (
		<button
			type="button"
			onClick={() => setActiveView({ type: "xiaoa" })}
			className={`p-3 text-left font-medium transition-colors ${
				activeView.type === "xiaoa"
					? "bg-primary text-primary-foreground"
					: "hover:bg-muted/50"
			}`}
		>
			🐣 小A
		</button>
	);
}

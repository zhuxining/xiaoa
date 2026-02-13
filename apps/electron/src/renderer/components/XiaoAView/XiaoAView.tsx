import { ChatView } from "../ProjectView/OperationArea/ChatView";
import { XiaoASessionList } from "./XiaoASessionList";

export function XiaoAView() {
	return (
		<div className="flex h-full">
			<XiaoASessionList />
			<div className="flex-1 flex flex-col">
				<ChatView />
			</div>
		</div>
	);
}

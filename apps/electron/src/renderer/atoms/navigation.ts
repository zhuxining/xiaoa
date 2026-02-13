import { atom } from "jotai";

export type ActiveView =
	| { type: "xiaoa" }
	| { type: "agent" }
	| { type: "skills" }
	| { type: "memories" }
	| { type: "knowledge" }
	| { type: "project"; projectId: string }
	| { type: "settings" };

export const activeViewAtom = atom<ActiveView>({ type: "xiaoa" });

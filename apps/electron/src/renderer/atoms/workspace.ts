import type { Workspace } from "@xiaoa/types";
import { atom } from "jotai";

export const workspacesAtom = atom<Workspace[]>([]);
export const activeWorkspaceIdAtom = atom<string | null>(null);

export const activeWorkspaceAtom = atom((get) => {
	const id = get(activeWorkspaceIdAtom);
	return get(workspacesAtom).find((w) => w.id === id) ?? null;
});

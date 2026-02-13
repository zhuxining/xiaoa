import type { Knowledge } from "@xiaoa/types";
import { atom } from "jotai";

export const knowledgeAtom = atom<Knowledge[]>([]);
export const selectedKnowledgeAtom = atom<Knowledge | null>(null);

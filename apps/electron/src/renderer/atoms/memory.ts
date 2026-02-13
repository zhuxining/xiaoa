import type { Memory } from "@xiaoa/types";
import { atom } from "jotai";

export const memoriesAtom = atom<Memory[]>([]);
export const selectedMemoryAtom = atom<Memory | null>(null);

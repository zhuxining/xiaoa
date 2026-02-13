import type { Skill } from "@xiaoa/types";
import { atom } from "jotai";

export const skillsAtom = atom<Skill[]>([]);
export const selectedSkillAtom = atom<Skill | null>(null);

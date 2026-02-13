import { DEFAULT_GLOBAL_CONFIG } from "@xiaoa/shared";
import type { GlobalConfig } from "@xiaoa/types";
import { atom } from "jotai";

export const globalConfigAtom = atom<GlobalConfig>(DEFAULT_GLOBAL_CONFIG);

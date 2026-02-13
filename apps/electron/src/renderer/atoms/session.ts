import type { Message, Session } from "@xiaoa/types";
import { atom } from "jotai";

export const sessionsAtom = atom<Session[]>([]);
export const activeSessionIdAtom = atom<string | null>(null);
export const messagesAtom = atom<Message[]>([]);

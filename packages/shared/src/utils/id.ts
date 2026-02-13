/**
 * ID generation utilities
 */

import { nanoid } from "nanoid";

const ID_PREFIXES = {
	workspace: "ws",
	session: "session",
	message: "msg",
	project: "proj",
	memory: "mem",
	knowledge: "know",
	skill: "skill",
} as const;

type EntityType = keyof typeof ID_PREFIXES;

export function generateId(type: EntityType): string {
	return `${ID_PREFIXES[type]}_${nanoid(12)}`;
}

export const generateWorkspaceId = () => generateId("workspace");
export const generateSessionId = () => generateId("session");
export const generateMessageId = () => generateId("message");
export const generateProjectId = () => generateId("project");
export const generateMemoryId = () => generateId("memory");
export const generateKnowledgeId = () => generateId("knowledge");
export const generateSkillId = () => generateId("skill");

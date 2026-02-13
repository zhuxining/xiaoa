import type { Skill, Workspace } from "@xiaoa/types";

export interface ToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

export interface ToolResult {
	success: boolean;
	output?: unknown;
	error?: string;
}

export async function executeSkill(
	_workspace: Workspace,
	skill: Skill,
	input: string,
): Promise<ToolResult> {
	console.log("Executing skill:", skill.name, "with input:", input);
	return { success: true, output: "Executed" };
}

export function parseSkillInvocation(message: string): {
	skillName: string | null;
	args: string;
} {
	const match = message.match(/^\/(\w+)(?:\s+(.*))?$/);
	if (match) {
		return { skillName: match[1], args: match[2] || "" };
	}
	return { skillName: null, args: message };
}

/**
 * Config validation utilities (zod wrappers)
 */

import {
	apiKeySchema,
	modelNameSchema,
	workspaceNameSchema,
} from "../validation/schemas";

export const validateWorkspaceName = (name: string) =>
	workspaceNameSchema.safeParse(name).success;

export const validateApiKey = (apiKey: string) =>
	apiKeySchema.safeParse(apiKey).success;

export const validateModelName = (model: string) =>
	modelNameSchema.safeParse(model).success;

/** 验证工作区名称 */
export function validateWorkspaceName(name: string): boolean {
	return name.length > 0 && name.length <= 50;
}

/** 验证 API Key 格式 */
export function validateApiKey(apiKey: string): boolean {
	return apiKey.length >= 20;
}

/** 验证模型名称 */
export function validateModelName(model: string): boolean {
	return model.length > 0;
}

import { nanoid } from "nanoid";

/**
 * 测试数据生成器
 * 用于 E2E 测试中生成测试数据
 */

/**
 * 生成唯一测试 ID
 */
export function generateTestId(prefix = "test"): string {
  return `${prefix}-${nanoid(8)}`;
}

/**
 * 生成测试会话数据
 */
export function generateTestSession(overrides?: {
  id?: string;
  title?: string;
  messageCount?: number;
}) {
  return {
    id: overrides?.id ?? generateTestId("session"),
    title: overrides?.title ?? `测试会话 ${Date.now()}`,
    messageCount: overrides?.messageCount ?? 0,
    updatedAt: new Date(),
  };
}

/**
 * 生成测试工作区数据
 */
export function generateTestWorkspace(overrides?: {
  id?: string;
  name?: string;
  path?: string;
}) {
  return {
    id: overrides?.id ?? generateTestId("workspace"),
    name: overrides?.name ?? `测试工作区 ${Date.now()}`,
    path: overrides?.path ?? `/tmp/test-workspace-${nanoid(8)}`,
  };
}

/**
 * 生成测试技能数据
 */
export function generateTestSkill(overrides?: {
  id?: string;
  name?: string;
  description?: string;
  content?: string;
}) {
  return {
    id: overrides?.id ?? generateTestId("skill"),
    name: overrides?.name ?? `测试技能 ${Date.now()}`,
    description: overrides?.description ?? "这是一个测试技能",
    content: overrides?.content ?? "# 测试技能\n\n这是一个测试技能的内容。",
  };
}

/**
 * 生成测试知识数据
 */
export function generateTestKnowledge(overrides?: {
  id?: string;
  title?: string;
  content?: string;
}) {
  return {
    id: overrides?.id ?? generateTestId("knowledge"),
    title: overrides?.title ?? `测试知识 ${Date.now()}`,
    content: overrides?.content ?? "这是测试知识的内容。",
  };
}

/**
 * 生成测试消息
 */
export function generateTestMessage(overrides?: {
  id?: string;
  content?: string;
  role?: "user" | "assistant";
}) {
  return {
    id: overrides?.id ?? generateTestId("msg"),
    content: overrides?.content ?? `测试消息 ${Date.now()}`,
    role: overrides?.role ?? ("user" as const),
  };
}

/**
 * 生成测试权限请求
 */
export function generateTestPermissionRequest(overrides?: {
  id?: string;
  type?: "file_read" | "file_write" | "execute" | "network";
  title?: string;
  description?: string;
  risk?: "low" | "medium" | "high";
}) {
  return {
    id: overrides?.id ?? generateTestId("perm"),
    type: overrides?.type ?? ("execute" as const),
    title: overrides?.title ?? "测试权限请求",
    description: overrides?.description ?? "这是一个测试权限请求",
    risk: overrides?.risk ?? ("medium" as const),
  };
}

/**
 * 生成测试 LLM 配置
 */
export function generateTestLLMConfig(overrides?: {
  provider?: string;
  apiKey?: string;
  model?: string;
}) {
  return {
    provider: overrides?.provider ?? "anthropic",
    apiKey: overrides?.apiKey ?? "test-api-key",
    model: overrides?.model ?? "claude-sonnet-4-5-20250514",
  };
}

/**
 * 清理测试数据的辅助函数
 */
export function cleanupTestData(pattern: RegExp): void {
  console.log(`[E2E] Cleaning up test data matching: ${pattern}`);
}

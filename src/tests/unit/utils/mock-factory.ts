/**
 * Mock 工厂函数
 *
 * 提供测试用的 Mock 对象创建函数。
 */

import { vi } from "vitest";
import type { ActiveRun } from "@/agent/run/run-types";

/**
 * 创建模拟的 ActiveRun
 */
export function createMockActiveRun(
  overrides: Partial<ActiveRun> = {}
): ActiveRun {
  return {
    runId: `run-${Date.now()}`,
    key: "global:test-session-id",
    scope: "global",
    workspaceId: null,
    sessionId: "test-session-id",
    content: "test message",
    workspaceRootPath: null,
    aborted: false,
    isResumed: false,
    assistantBuffer: "",
    allowedPermissions: new Set(),
    thinkingLevel: "minimal",
    session: null,
    ...overrides,
  };
}

/**
 * 创建模拟的 workspace scope ActiveRun
 */
export function createMockWorkspaceRun(
  workspaceId: string,
  overrides: Partial<ActiveRun> = {}
): ActiveRun {
  const sessionId = overrides.sessionId ?? "test-session-id";
  return createMockActiveRun({
    scope: "workspace",
    key: `workspace:${workspaceId}:${sessionId}`,
    workspaceId,
    workspaceRootPath: `/test/workspace/${workspaceId}`,
    ...overrides,
  });
}

/**
 * 创建模拟的 AgentSession
 */
export function createMockAgentSession() {
  return {
    prompt: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
    steer: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => {}),
    getSessionStats: vi.fn().mockReturnValue({
      messageCount: 0,
      tokenCount: 0,
    }),
    getContextUsage: vi.fn().mockReturnValue({
      usedTokens: 0,
      maxTokens: 200000,
    }),
    setActiveToolsByName: vi.fn(),
    dispose: vi.fn(),
    messages: [],
  };
}

/**
 * 创建模拟的 CreateAgentSessionResult
 */
export function createMockSessionResult() {
  const session = createMockAgentSession();
  return {
    session,
    subscribe: vi.fn().mockReturnValue(() => {}),
  };
}

/**
 * 创建模拟的 ExtensionAPI
 */
export function createMockExtensionAPI() {
  return {
    on: vi.fn(),
    registerProvider: vi.fn(),
  };
}

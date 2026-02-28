/**
 * 集成测试 Setup
 *
 * 提供集成测试的全局配置，包括：
 * - 超时设置
 * - Mock 配置
 * - 测试环境初始化
 */

import { afterEach, beforeEach, vi } from "vitest";

// 设置全局超时
vi.setConfig({
  testTimeout: 30_000,
  hookTimeout: 10_000,
});

// Mock Electron 模块
vi.mock("electron", () => {
  const {
    electronMainMockFactory,
    setMockUserDataPath,
  } = require("../unit/__mocks__/electron-main");
  return {
    ...electronMainMockFactory(),
    setMockUserDataPath,
  };
});

// 全局 before/after 钩子
beforeEach(() => {
  // 重置所有 mock
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

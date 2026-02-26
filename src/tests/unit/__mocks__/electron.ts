/**
 * Electron API Mock
 *
 * 轻量级 Electron API Mock，用于单元测试。
 * 通过 setMockUserDataPath 设置模拟的用户数据目录。
 */

let mockUserDataPath = "";

/**
 * 设置模拟的 userData 路径
 */
export function setMockUserDataPath(path: string): void {
  mockUserDataPath = path;
}

/**
 * 获取当前模拟的 userData 路径
 */
export function getMockUserDataPath(): string {
  return mockUserDataPath;
}

/**
 * 重置 mock 状态
 */
export function resetElectronMock(): void {
  mockUserDataPath = "";
}

// 导出 vi.mock 的工厂函数
export const electronMockFactory = () => ({
  app: {
    getPath: (name: string) => (name === "userData" ? mockUserDataPath : ""),
  },
});

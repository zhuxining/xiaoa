/**
 * Electron Main 进程 Mock
 *
 * 提供完整的 Electron API Mock，用于 Main 进程单元测试和集成测试。
 */

import type { app, BrowserWindow, IpcMain, IpcRenderer } from "electron";
import { vi } from "vitest";

let mockUserDataPath = "";
let mockAppDataPath = "";
let mockHomePath = "";
let mockIsPackaged = false;

/**
 * 设置模拟的 userData 路径
 */
export function setMockUserDataPath(path: string): void {
  mockUserDataPath = path;
}

/**
 * 设置模拟的 appData 路径
 */
export function setMockAppDataPath(path: string): void {
  mockAppDataPath = path;
}

/**
 * 设置模拟的 home 路径
 */
export function setMockHomePath(path: string): void {
  mockHomePath = path;
}

/**
 * 设置模拟的 isPackaged 状态
 */
export function setMockIsPackaged(isPackaged: boolean): void {
  mockIsPackaged = isPackaged;
}

/**
 * 获取当前模拟的 userData 路径
 */
export function getMockUserDataPath(): string {
  return mockUserDataPath;
}

/**
 * 重置所有 mock 状态
 */
export function resetElectronMock(): void {
  mockUserDataPath = "";
  mockAppDataPath = "";
  mockHomePath = "";
  mockIsPackaged = false;
}

/**
 * 创建模拟的 app 对象
 */
export function createMockApp(): typeof app {
  return {
    getPath: (name: string) => {
      switch (name) {
        case "userData":
          return mockUserDataPath;
        case "appData":
          return mockAppDataPath;
        case "home":
          return mockHomePath;
        default:
          return "";
      }
    },
    isPackaged: mockIsPackaged,
    getName: () => "xiaoa",
    getVersion: () => "0.0.1",
    quit: vi.fn(),
    relaunch: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    setAppUserModelId: vi.fn(),
  } as unknown as typeof app;
}

/**
 * 创建模拟的 BrowserWindow
 */
export function createMockBrowserWindow(): BrowserWindow {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    restore: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    isFocused: vi.fn().mockReturnValue(true),
    isMinimized: vi.fn().mockReturnValue(false),
    isMaximized: vi.fn().mockReturnValue(false),
    isVisible: vi.fn().mockReturnValue(true),
    isDestroyed: vi.fn().mockReturnValue(false),
    getSize: vi.fn().mockReturnValue([1200, 800]),
    getPosition: vi.fn().mockReturnValue([100, 100]),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    setTitle: vi.fn(),
    getTitle: vi.fn().mockReturnValue("xiaoa"),
    webContents: {
      send: vi.fn(),
      openDevTools: vi.fn(),
      closeDevTools: vi.fn(),
      isDevToolsOpened: vi.fn().mockReturnValue(false),
      on: vi.fn(),
      once: vi.fn(),
      executeJavaScript: vi.fn().mockResolvedValue(undefined),
    } as unknown as BrowserWindow["webContents"],
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(callback);
    }),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn((event: string, ...args: unknown[]) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((cb) => cb(...args));
      }
    }),
  } as unknown as BrowserWindow;
}

/**
 * 创建模拟的 ipcMain
 */
export function createMockIpcMain(): IpcMain {
  const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    handle: vi.fn(
      (channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler);
      }
    ),
    handleOnce: vi.fn(),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
    on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(channel)) {
        listeners.set(channel, new Set());
      }
      listeners.get(channel)?.add(listener);
    }),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as unknown as IpcMain;
}

/**
 * 创建模拟的 ipcRenderer
 */
export function createMockIpcRenderer(): IpcRenderer {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    invoke: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    sendSync: vi.fn().mockReturnValue(undefined),
    on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(channel)) {
        listeners.set(channel, new Set());
      }
      listeners.get(channel)?.add(listener);
      return createMockIpcRenderer();
    }),
    once: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn((channel: string) => {
      listeners.delete(channel);
    }),
    emit: vi.fn(),
  } as unknown as IpcRenderer;
}

/**
 * 完整的 Electron Mock 工厂
 */
export const electronMainMockFactory = () => ({
  app: createMockApp(),
  BrowserWindow: vi.fn().mockImplementation(() => createMockBrowserWindow()),
  ipcMain: createMockIpcMain(),
  ipcRenderer: createMockIpcRenderer(),
  dialog: {
    showOpenDialog: vi
      .fn()
      .mockResolvedValue({ canceled: false, filePaths: [] }),
    showSaveDialog: vi
      .fn()
      .mockResolvedValue({ canceled: false, filePath: "" }),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
    showErrorBox: vi.fn(),
  },
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({ popup: vi.fn() }),
    setApplicationMenu: vi.fn(),
    getApplicationMenu: vi.fn().mockReturnValue(null),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(true),
    openPath: vi.fn().mockResolvedValue(""),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: vi.fn(),
    off: vi.fn(),
  },
});

/**
 * pi-coding-agent Mock 工厂
 *
 * 提供可配置的 Mock 对象，用于单元测试和集成测试。
 * 支持流式响应模拟、权限请求模拟、工具调用模拟。
 */

import type {
  AgentSession,
  AgentSessionEvent,
  CreateAgentSessionResult,
} from "@mariozechner/pi-coding-agent";
import { vi } from "vitest";

/**
 * Mock AgentSession 配置选项
 */
export interface MockSessionOptions {
  /** 预设的响应内容队列 */
  responses?: string[];
  /** 是否在工具调用时请求权限 */
  shouldRequestPermission?: boolean;
  /** 是否在 prompt 时抛出错误 */
  shouldThrow?: boolean;
  /** 流式响应的字符延迟（毫秒） */
  streamDelay?: number;
  /** 抛出的错误消息 */
  throwMessage?: string;
  /** 预设的工具调用列表 */
  toolCalls?: MockToolCall[];
}

/**
 * Mock 工具调用
 */
export interface MockToolCall {
  arguments: Record<string, unknown>;
  id: string;
  isError?: boolean;
  name: string;
  result?: unknown;
}

/**
 * 创建可配置的 Mock AgentSession
 */
export function createMockAgentSession(
  options: MockSessionOptions = {}
): AgentSession & {
  _setResponses: (responses: string[]) => void;
  _setShouldThrow: (should: boolean, message?: string) => void;
  _getPromptCalls: () => string[];
} {
  const {
    responses = ["Mock response"],
    streamDelay = 10,
    shouldRequestPermission = false,
    toolCalls = [],
    shouldThrow = false,
    throwMessage = "Mock error",
  } = options;

  let responseQueue = [...responses];
  let currentShouldThrow = shouldThrow;
  let currentThrowMessage = throwMessage;
  const promptCalls: string[] = [];
  const subscribers = new Set<(event: AgentSessionEvent) => void>();
  let isAborted = false;
  const messages: unknown[] = [];

  const emit = (event: AgentSessionEvent) => {
    subscribers.forEach((cb) => cb(event));
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const mockSession = {
    prompt: vi.fn(async (content: string) => {
      promptCalls.push(content);

      if (currentShouldThrow) {
        throw new Error(currentThrowMessage);
      }

      isAborted = false;
      const response = responseQueue.shift() || "Default response";

      // 模拟 turn_start
      emit({ type: "turn_start" });

      // 模拟工具调用（如果配置了）
      for (const toolCall of toolCalls) {
        if (isAborted) {
          break;
        }

        emit({
          type: "tool_execution_start",
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          args: toolCall.arguments,
        });

        if (shouldRequestPermission) {
          // 权限请求会暂停执行，等待响应
          await delay(50);
        }

        if (isAborted) {
          break;
        }

        await delay(streamDelay);

        emit({
          type: "tool_execution_end",
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          result: toolCall.result ?? "Tool result",
          isError: toolCall.isError ?? false,
        });
      }

      // 模拟流式文本响应
      emit({
        type: "message_update",
        assistantMessageEvent: {
          type: "text_delta",
          contentIndex: 0,
          delta: "",
          partial: {},
        },
      } as unknown as AgentSessionEvent);

      for (const char of response) {
        if (isAborted) {
          break;
        }
        await delay(streamDelay);
        emit({
          type: "message_update",
          assistantMessageEvent: {
            type: "text_delta",
            contentIndex: 0,
            delta: char,
            partial: {},
          },
        } as unknown as AgentSessionEvent);
      }

      if (!isAborted) {
        emit({
          type: "message_end",
          message: {
            role: "assistant",
            content: [{ type: "text", text: response }],
          },
        } as unknown as AgentSessionEvent);
        emit({
          type: "turn_end",
          message: {},
          toolResults: [],
        } as unknown as AgentSessionEvent);
      }
    }),

    abort: vi.fn(async () => {
      isAborted = true;
      emit({
        type: "message_end",
        message: {
          role: "assistant",
          content: [],
        },
      } as unknown as AgentSessionEvent);
    }),

    steer: vi.fn(async (_message: string) => {
      // Steering 模拟
    }),

    followUp: vi.fn(async (_message: string) => {
      // Follow-up 模拟
    }),

    subscribe: vi.fn((callback: (event: AgentSessionEvent) => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }),

    getSessionStats: vi.fn(() => ({
      messageCount: messages.length,
      tokenCount: 100,
    })),

    getContextUsage: vi.fn(() => ({
      usedTokens: 100,
      maxTokens: 200_000,
    })),

    setActiveToolsByName: vi.fn(),

    dispose: vi.fn(),

    messages,

    // 测试辅助方法
    _setResponses: (newResponses: string[]) => {
      responseQueue = [...newResponses];
    },

    _setShouldThrow: (should: boolean, message?: string) => {
      currentShouldThrow = should;
      if (message) {
        currentThrowMessage = message;
      }
    },

    _getPromptCalls: () => [...promptCalls],
  } as unknown as AgentSession & {
    _setResponses: (responses: string[]) => void;
    _setShouldThrow: (should: boolean, message?: string) => void;
    _getPromptCalls: () => string[];
  };

  return mockSession;
}

/**
 * 创建 Mock CreateAgentSessionResult
 */
export function createMockSessionResult(
  options: MockSessionOptions = {}
): CreateAgentSessionResult & {
  session: ReturnType<typeof createMockAgentSession>;
} {
  const session = createMockAgentSession(options);
  return {
    session,
    subscribe: vi.fn().mockReturnValue(() => {}),
  } as unknown as CreateAgentSessionResult & {
    session: typeof session;
  };
}

/**
 * 创建模拟流式响应的生成器
 */
export async function* mockStreamResponse(
  content: string,
  delay = 50
): AsyncGenerator<string> {
  for (const char of content) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    yield char;
  }
}

/**
 * 创建预设的工具调用
 */
export function createMockToolCalls(): Record<string, MockToolCall> {
  return {
    fileRead: {
      id: "tc-file-read",
      name: "read_file",
      arguments: { path: "/test/file.ts" },
      result: "file content",
    },
    fileWrite: {
      id: "tc-file-write",
      name: "write_file",
      arguments: { path: "/test/file.ts", content: "new content" },
      result: "written",
    },
    bashExecute: {
      id: "tc-bash",
      name: "bash",
      arguments: { command: "echo hello" },
      result: "hello\n",
    },
    bashError: {
      id: "tc-bash-error",
      name: "bash",
      arguments: { command: "exit 1" },
      result: "Command failed with exit code 1",
      isError: true,
    },
  };
}

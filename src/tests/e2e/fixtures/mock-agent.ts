/**
 * Mock Agent 消息生成器
 * 用于 E2E 测试中模拟 LLM 响应
 *
 * 注：使用简化的类型定义，避免依赖复杂的 pi-agent-core 类型
 */

export interface MockMessageOptions {
  content?: string;
  delay?: number;
  role?: "user" | "assistant";
}

export interface MockToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * 创建 Mock 用户消息（简化版）
 */
export function createMockUserMessage(content: string) {
  return {
    role: "user" as const,
    content: [{ type: "text" as const, text: content }],
    timestamp: Date.now(),
  };
}

/**
 * 创建 Mock 助手消息（简化版）
 */
export function createMockAssistantMessage(content: string) {
  return {
    role: "assistant" as const,
    content: [{ type: "text" as const, text: content }],
    timestamp: Date.now(),
  };
}

/**
 * 预设的 Mock 响应
 */
export const MOCK_RESPONSES = {
  greeting: "你好！我是小A，有什么可以帮助你的吗？",
  echo: (msg: string) => `收到你的消息：${msg}`,
  code: `这是一个示例代码：

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

你可以使用这个函数来问候用户。`,
  permission: {
    fileRead: {
      title: "文件读取权限",
      description: "Agent 请求读取文件内容",
      type: "file_read" as const,
      risk: "low" as const,
    },
    fileWrite: {
      title: "文件写入权限",
      description: "Agent 请求修改文件内容",
      type: "file_write" as const,
      risk: "medium" as const,
    },
    execute: {
      title: "命令执行权限",
      description: "Agent 请求执行 Shell 命令",
      type: "execute" as const,
      risk: "high" as const,
    },
  },
};

/**
 * 模拟流式响应
 */
export async function* mockStreamResponse(
  content: string,
  delay = 50
): AsyncGenerator<string> {
  const words = content.split("");
  for (const word of words) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    yield word;
  }
}

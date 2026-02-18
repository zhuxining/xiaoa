import type { AgentTool } from "@mariozechner/pi-agent-core";
import { requestPermission } from "../permission/permission-request";
import type { ToolContext } from "../run/run-types";

export function patchToolsWithPermission(
  tools: AgentTool[],
  context: ToolContext
): AgentTool[] {
  return tools.map((tool) => {
    const needsPermission =
      tool.name === "file_write" || tool.name === "file_read";

    if (!needsPermission) {
      return tool;
    }

    return {
      ...tool,
      execute: async (toolCallId, params, signal, onUpdate) => {
        if (tool.name === "file_write") {
          await requestPermission(
            context.run,
            "file_write",
            "high",
            "文件写入",
            "请求写入文件",
            (params as { path?: string }).path ?? ""
          );
        } else if (tool.name === "file_read") {
          await requestPermission(
            context.run,
            "file_read",
            "low",
            "文件读取",
            "请求读取文件",
            (params as { path?: string }).path ?? ""
          );
        }

        return tool.execute(toolCallId, params, signal, onUpdate);
      },
    };
  });
}

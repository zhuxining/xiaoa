/**
 * file-tools.ts - 文件操作工具
 *
 * 包含权限检查的文件工具：
 * - createFileReadTool: 读取文件内容
 * - createFileWriteTool: 写入文件内容
 * - createFileListTool: 列出目录内容
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, normalize, relative } from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import { requestPermission } from "../permission";
import type { ActiveRun } from "../run";

/**
 * 文件读取工具参数 Schema
 */
const fileReadSchema = Type.Object({
  path: Type.String({
    description: "要读取的文件路径，相对于工作区根目录",
  }),
});

/**
 * 文件写入工具参数 Schema
 */
const fileWriteSchema = Type.Object({
  content: Type.String({
    description: "要写入的文件内容",
  }),
  path: Type.String({
    description: "要写入的文件路径，相对于工作区根目录",
  }),
});

/**
 * 目录列表工具参数 Schema
 */
const fileListSchema = Type.Object({
  path: Type.String({
    description: "要列出的目录路径，相对于工作区根目录",
  }),
});

/**
 * 验证路径是否在工作区内
 */
function validatePath(
  workspaceRoot: string | null,
  targetPath: string
): { valid: boolean; absolutePath?: string; error?: string } {
  if (!workspaceRoot) {
    return { valid: false, error: "无工作区路径" };
  }

  // 解析绝对路径
  const absolutePath = isAbsolute(targetPath)
    ? normalize(targetPath)
    : normalize(join(workspaceRoot, targetPath));

  // 检查是否在工作区内
  const relativePath = relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return {
      valid: false,
      error: `路径越界: ${targetPath} 不在工作区内`,
    };
  }

  return { valid: true, absolutePath };
}

/**
 * 创建文件读取工具
 */
export function createFileReadTool(
  run: ActiveRun
): AgentTool<typeof fileReadSchema> {
  return {
    name: "file_read",
    description: "读取文件内容",
    parameters: fileReadSchema,
    label: "读取文件",
    async execute(
      _toolCallId: string,
      params: { path: string },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<undefined>> {
      // 验证路径
      const { valid, absolutePath, error } = validatePath(
        run.workspaceRootPath,
        params.path
      );
      if (!(valid && absolutePath)) {
        return {
          content: [{ type: "text", text: `错误: ${error}` }],
          details: undefined,
        };
      }

      // 请求权限
      const decision = await requestPermission(run, "file_read", params);
      if (decision === "deny") {
        return {
          content: [{ type: "text", text: "权限被拒绝" }],
          details: undefined,
        };
      }

      try {
        const content = await readFile(absolutePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
          details: undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `读取失败: ${errorMessage}` }],
          details: undefined,
        };
      }
    },
  };
}

/**
 * 创建文件写入工具
 */
export function createFileWriteTool(
  run: ActiveRun
): AgentTool<typeof fileWriteSchema> {
  return {
    name: "file_write",
    description: "写入文件内容。如果文件不存在则创建，存在则覆盖。",
    parameters: fileWriteSchema,
    label: "写入文件",
    async execute(
      _toolCallId: string,
      params: { path: string; content: string },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<undefined>> {
      // 验证路径
      const { valid, absolutePath, error } = validatePath(
        run.workspaceRootPath,
        params.path
      );
      if (!(valid && absolutePath)) {
        return {
          content: [{ type: "text", text: `错误: ${error}` }],
          details: undefined,
        };
      }

      // 请求权限
      const decision = await requestPermission(run, "file_write", params);
      if (decision === "deny") {
        return {
          content: [{ type: "text", text: "权限被拒绝" }],
          details: undefined,
        };
      }

      try {
        // 确保目录存在
        const dir = dirname(absolutePath);
        await mkdir(dir, { recursive: true });

        // 写入文件
        await writeFile(absolutePath, params.content, "utf-8");

        return {
          content: [{ type: "text", text: `成功写入: ${params.path}` }],
          details: undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `写入失败: ${errorMessage}` }],
          details: undefined,
        };
      }
    },
  };
}

/**
 * 创建目录列表工具
 */
export function createFileListTool(
  run: ActiveRun
): AgentTool<typeof fileListSchema> {
  return {
    name: "file_list",
    description: "列出目录内容",
    parameters: fileListSchema,
    label: "列出目录",
    async execute(
      _toolCallId: string,
      params: { path: string },
      _signal?: AbortSignal
    ): Promise<AgentToolResult<undefined>> {
      // 验证路径
      const { valid, absolutePath, error } = validatePath(
        run.workspaceRootPath,
        params.path
      );
      if (!(valid && absolutePath)) {
        return {
          content: [{ type: "text", text: `错误: ${error}` }],
          details: undefined,
        };
      }

      // 请求权限
      const decision = await requestPermission(run, "file_list", params);
      if (decision === "deny") {
        return {
          content: [{ type: "text", text: "权限被拒绝" }],
          details: undefined,
        };
      }

      try {
        const entries = await readdir(absolutePath, {
          withFileTypes: true,
        });
        const lines = entries.map((entry) => {
          let prefix = "❓ ";
          if (entry.isDirectory()) {
            prefix = "📁 ";
          } else if (entry.isFile()) {
            prefix = "📄 ";
          }
          return `${prefix}${entry.name}`;
        });

        return {
          content: [
            {
              type: "text",
              text: lines.length > 0 ? lines.join("\n") : "（空目录）",
            },
          ],
          details: undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `列出失败: ${errorMessage}` }],
          details: undefined,
        };
      }
    },
  };
}

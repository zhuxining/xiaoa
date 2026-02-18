import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import type { ToolContext } from "../run/run-types";

function normalizePath(path: string, root: string | null): string {
  if (path.startsWith("/")) {
    return path;
  }
  if (!root) {
    throw new Error("当前会话未绑定项目目录");
  }
  return join(root, path);
}

function assertPathInProject(path: string, root: string | null): void {
  if (!root) {
    throw new Error("当前会话未绑定项目目录");
  }
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (path !== root && !path.startsWith(normalizedRoot)) {
    throw new Error("禁止访问项目目录之外的路径");
  }
}

export function readFileTool(path: string, context: ToolContext): string {
  const fullPath = normalizePath(path, context.projectRoot);
  assertPathInProject(fullPath, context.projectRoot);

  if (!existsSync(fullPath)) {
    throw new Error(`文件不存在: ${fullPath}`);
  }

  const stat = statSync(fullPath);
  if (stat.size > 1024 * 1024) {
    return `文件过大（${Math.round(stat.size / 1024)}KB），请缩小范围。`;
  }

  return readFileSync(fullPath, "utf-8");
}

export function listFileTool(path: string, context: ToolContext): string {
  const dirPath = normalizePath(path || ".", context.projectRoot);
  assertPathInProject(dirPath, context.projectRoot);

  if (!existsSync(dirPath)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }

  const lines = readdirSync(dirPath)
    .filter((name) => !name.startsWith("."))
    .map((name) => {
      const fullPath = join(dirPath, name);
      return `${statSync(fullPath).isDirectory() ? "[D]" : "[F]"} ${name}`;
    });

  return lines.length > 0 ? lines.join("\n") : "目录为空";
}

export function writeFileTool(
  path: string,
  content: string,
  context: ToolContext
): string {
  const fullPath = normalizePath(path, context.projectRoot);
  assertPathInProject(fullPath, context.projectRoot);

  const slash = fullPath.lastIndexOf("/");
  if (slash > 0) {
    const dir = fullPath.slice(0, slash);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  writeFileSync(fullPath, content, "utf-8");
  return `已写入 ${fullPath}`;
}

export function createFileTools(context: ToolContext): AgentTool[] {
  return [
    {
      name: "file_read",
      label: "File Read",
      description: "读取项目中的文件内容",
      parameters: Type.Object({
        path: Type.String({ description: "项目内文件路径" }),
      }),
      execute: (_toolCallId, rawParams) => {
        const params = rawParams as { path: string };
        const text = readFileTool(params.path, context);
        return Promise.resolve({
          content: [{ type: "text" as const, text }],
          details: { path: params.path },
        });
      },
    },
    {
      name: "file_list",
      label: "File List",
      description: "列出项目目录下的文件",
      parameters: Type.Object({
        path: Type.String({ description: "目录路径" }),
      }),
      execute: (_toolCallId, rawParams) => {
        const params = rawParams as { path: string };
        const text = listFileTool(params.path, context);
        return Promise.resolve({
          content: [{ type: "text" as const, text }],
          details: { path: params.path },
        });
      },
    },
    {
      name: "file_write",
      label: "File Write",
      description: "写入或创建项目文件",
      parameters: Type.Object({
        path: Type.String({ description: "目标文件路径" }),
        content: Type.String({ description: "写入内容" }),
      }),
      execute: (_toolCallId, rawParams) => {
        const params = rawParams as { path: string; content: string };
        return Promise.resolve({
          content: [
            {
              type: "text" as const,
              text: writeFileTool(params.path, params.content, context),
            },
          ],
          details: { path: params.path },
        });
      },
    },
  ];
}

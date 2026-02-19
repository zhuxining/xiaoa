/**
 * bash-tool.ts - Bash 命令执行工具
 *
 * 包含风险判定的命令执行：
 * - 高危命令（rm -rf, dd, mkfs）需要确认
 * - 支持 AbortSignal 中止执行
 * - 命令超时限制
 */

import { spawn } from "node:child_process";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import { requestPermission } from "../permission";
import type { ActiveRun } from "../run";

/**
 * Bash 工具参数 Schema
 */
const bashSchema = Type.Object({
  command: Type.String({
    description: "要执行的 shell 命令",
  }),
  timeout: Type.Optional(
    Type.Number({
      description: "命令超时时间（毫秒），默认 60000",
    })
  ),
});

/**
 * 高危命令模式
 */
const HIGH_RISK_PATTERNS = [
  /\brm\s+(-[rf]+\s+|.*\s+-[rf]+\s*)\//, // rm -rf /
  /\brm\s+(-[rf]+\s+|.*\s+-[rf]+\s*)\*/, // rm -rf *
  /\bdd\s+.*of=\/dev\//, // dd to device
  /\bmkfs\./, // mkfs commands
  /\bfdisk\s+\/dev\//, // fdisk
  /\bformat\s+[a-z]:/i, // format drive
  /\bshred\b/, // shred command
  /\bwipefs\b/, // wipefs
  />\s*\/dev\/(sda|hda|nvme|vda)/, // overwrite device
  /\bchmod\s+(-R\s+)?000\s+\//, // chmod 000 /
  /\bchown\s+(-R\s+)?\S+\s+\//, // chown root /
];

/**
 * 检查是否为高危命令
 */
function isHighRiskCommand(command: string): boolean {
  const normalized = command.toLowerCase().trim();
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * 创建 Bash 工具
 */
export function createBashTool(run: ActiveRun): AgentTool<typeof bashSchema> {
  return {
    name: "bash",
    description:
      "在终端中执行 shell 命令。支持大多数 Unix/Linux 命令。高危命令需要额外确认。",
    parameters: bashSchema,
    label: "执行命令",
    async execute(
      _toolCallId: string,
      params: { command: string; timeout?: number },
      signal?: AbortSignal
    ): Promise<AgentToolResult<undefined>> {
      const { command, timeout = 60_000 } = params;

      // 检查是否为高危命令
      if (isHighRiskCommand(command)) {
        const decision = await requestPermission(run, "bash", {
          command,
          highRisk: true,
        });
        if (decision === "deny") {
          return {
            content: [{ type: "text", text: "高危命令被拒绝执行" }],
            details: undefined,
          };
        }
      } else {
        // 普通命令也需要权限检查
        const decision = await requestPermission(run, "bash", params);
        if (decision === "deny") {
          return {
            content: [{ type: "text", text: "权限被拒绝" }],
            details: undefined,
          };
        }
      }

      return new Promise((resolve) => {
        const chunks: string[] = [];
        const errorChunks: string[] = [];
        let completed = false;

        // 检查是否已中止
        if (signal?.aborted) {
          resolve({
            content: [{ type: "text", text: "命令已中止" }],
            details: undefined,
          });
          return;
        }

        // 设置超时
        const timeoutId = setTimeout(() => {
          if (!completed) {
            completed = true;
            child.kill("SIGKILL");
            resolve({
              content: [{ type: "text", text: `命令超时（${timeout}ms）` }],
              details: undefined,
            });
          }
        }, timeout);

        // 执行命令
        const child = spawn("sh", ["-c", command], {
          cwd: run.workspaceRootPath ?? undefined,
          env: process.env,
        });

        // 收集输出
        child.stdout.on("data", (data: Buffer) => {
          chunks.push(data.toString());
        });

        child.stderr.on("data", (data: Buffer) => {
          errorChunks.push(data.toString());
        });

        // 处理中止信号
        signal?.addEventListener("abort", () => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            child.kill("SIGKILL");
            resolve({
              content: [{ type: "text", text: "命令已中止" }],
              details: undefined,
            });
          }
        });

        // 处理完成
        child.on("close", (code: number) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);

          const output = chunks.join("");
          const errors = errorChunks.join("");
          const combined = errors ? `${output}\n${errors}` : output;

          if (code === 0) {
            resolve({
              content: [
                {
                  type: "text",
                  text: combined.trim() || "命令执行成功（无输出）",
                },
              ],
              details: undefined,
            });
          } else {
            resolve({
              content: [
                {
                  type: "text",
                  text: `命令退出码: ${code}\n${combined.trim()}`,
                },
              ],
              details: undefined,
            });
          }
        });

        // 处理错误
        child.on("error", (err: Error) => {
          if (completed) {
            return;
          }
          completed = true;
          clearTimeout(timeoutId);
          resolve({
            content: [{ type: "text", text: `执行错误: ${err.message}` }],
            details: undefined,
          });
        });
      });
    },
  };
}

// 导出辅助函数供测试使用
export { isHighRiskCommand };

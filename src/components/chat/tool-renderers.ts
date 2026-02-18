/**
 * tool-renderers.ts - 注册自定义工具渲染器
 *
 * 为 pi-web-ui MessageList 注册自定义工具渲染器。
 * 使用 Lit html 模板创建渲染内容。
 */

import type { ToolResultMessage } from "@mariozechner/pi-ai";
import {
  registerToolRenderer,
  renderHeader,
  type ToolRenderer,
  type ToolRenderResult,
} from "@mariozechner/pi-web-ui";
import { html } from "lit";
import { FileText, FileWarning } from "lucide";

/**
 * FileWrite 工具参数接口
 */
interface FileWriteParams {
  content: string;
  path: string;
}

/**
 * FileWriteRenderer - 文件写入工具渲染器
 *
 * 显示文件路径和写入状态（成功/失败）
 */
class FileWriteRenderer implements ToolRenderer<FileWriteParams> {
  render(
    params: FileWriteParams | undefined,
    result: ToolResultMessage | undefined
  ): ToolRenderResult {
    const state = result
      ? result.isError
        ? "error"
        : "complete"
      : "inprogress";

    // 有结果时显示路径 + 状态
    if (result && params?.path) {
      const icon = result.isError ? FileWarning : FileText;
      const statusText = result.isError ? "写入失败" : "写入成功";
      const output = result.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      return {
        content: html`
					<div class="space-y-2">
						${renderHeader(state, icon, statusText)}
						<div class="text-sm text-muted-foreground font-mono">
							${params.path}
						</div>
						${
              output
                ? html`<console-block
									.content=${output}
									.variant=${result.isError ? "error" : "default"}
							  ></console-block>`
                : null
            }
					</div>
				`,
        isCustom: true,
      };
    }

    // 只有参数（正在执行或等待）
    if (params?.path) {
      return {
        content: html`
					<div class="space-y-2">
						${renderHeader(state, FileText, "正在写入文件...")}
						<div class="text-sm text-muted-foreground font-mono">
							${params.path}
						</div>
					</div>
				`,
        isCustom: true,
      };
    }

    // 无参数
    return {
      content: renderHeader(state, FileText, "等待文件路径..."),
      isCustom: false,
    };
  }
}

/**
 * FileReadRenderer - 文件读取工具渲染器
 *
 * 显示文件路径和读取状态
 */
class FileReadRenderer implements ToolRenderer<{ path: string }> {
  render(
    params: { path: string } | undefined,
    result: ToolResultMessage | undefined
  ): ToolRenderResult {
    const state = result
      ? result.isError
        ? "error"
        : "complete"
      : "inprogress";
    const icon = result?.isError ? FileWarning : FileText;

    if (params?.path) {
      const statusText = result
        ? result.isError
          ? "读取失败"
          : "读取成功"
        : "正在读取文件...";

      return {
        content: html`
					<div class="space-y-2">
						${renderHeader(state, icon, statusText)}
						<div class="text-sm text-muted-foreground font-mono">
							${params.path}
						</div>
					</div>
				`,
        isCustom: true,
      };
    }

    return {
      content: renderHeader(state, FileText, "等待文件路径..."),
      isCustom: false,
    };
  }
}

/**
 * 初始化自定义工具渲染器
 *
 * 在应用启动时调用，注册所有自定义渲染器到 pi-web-ui。
 * pi-web-ui 内置的 bash 渲染器无需重复注册。
 */
export function setupToolRenderers(): void {
  registerToolRenderer("file_write", new FileWriteRenderer());
  registerToolRenderer("file_read", new FileReadRenderer());
  registerToolRenderer("write_file", new FileWriteRenderer()); // 别名
  registerToolRenderer("read_file", new FileReadRenderer()); // 别名
}

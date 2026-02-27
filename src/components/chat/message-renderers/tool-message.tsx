import type { ToolResultMessage } from "@mariozechner/pi-ai";
import { ClockIcon } from "lucide-react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/utils/tailwind";
import { toToolPart } from "../adapters/tool-adapter";

interface ToolCallData {
  arguments: Record<string, unknown>;
  id: string;
  name: string;
}

interface ToolMessageProps {
  className?: string;
  result?: ToolResultMessage;
  toolCall: ToolCallData;
}

export function ToolMessage({ toolCall, result, className }: ToolMessageProps) {
  const adapted = toToolPart(toolCall, result);

  return (
    <Tool className={cn("bg-muted/30", className)} defaultOpen>
      <ToolHeader
        state={adapted.state}
        title={toolCall.name}
        toolName={toolCall.name}
        type="dynamic-tool"
      />
      <ToolContent>
        {Object.keys(toolCall.arguments).length > 0 && (
          <ToolInput input={adapted.input} />
        )}
        {adapted.state === "input-available" && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <ClockIcon className="size-3" />
            <span>等待工具执行...</span>
          </div>
        )}
        <ToolOutput
          errorText={adapted.errorText ?? undefined}
          output={adapted.output}
        />
      </ToolContent>
    </Tool>
  );
}

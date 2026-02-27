import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import type { ContextUsage, SessionStats } from "./adapters/context-adapter";
import { toContextProps } from "./adapters/context-adapter";

interface ContextUsageProps {
  className?: string;
  contextUsage: ContextUsage | null;
  modelId?: string;
  sessionStats: SessionStats | null;
}

export function ContextUsageDisplay({
  contextUsage,
  sessionStats,
  modelId,
  className,
}: ContextUsageProps) {
  const contextProps = toContextProps(sessionStats, contextUsage, modelId);

  if (!contextProps) {
    return null;
  }

  return (
    <Context {...contextProps}>
      <ContextTrigger className={className} />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}

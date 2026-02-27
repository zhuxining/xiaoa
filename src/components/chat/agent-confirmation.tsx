import { AlertTriangle, FileText, Globe, Shield } from "lucide-react";
import { useState } from "react";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";
import type { PermissionRequest, PermissionType } from "./permission-dialog";

const PERMISSION_ICONS: Record<PermissionType, React.ReactNode> = {
  file_read: <FileText className="size-3.5" />,
  file_write: <FileText className="size-3.5" />,
  execute: <Shield className="size-3.5" />,
  network: <Globe className="size-3.5" />,
};

const RISK_STYLES: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
};

const RISK_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

interface AgentConfirmationProps {
  onAllow?: (request: PermissionRequest) => void;
  onDeny?: (request: PermissionRequest) => void;
  request: PermissionRequest | null;
}

export function AgentConfirmation({
  request,
  onAllow,
  onDeny,
}: AgentConfirmationProps) {
  const [rememberInSession, setRememberInSession] = useState(false);

  if (!request) {
    return null;
  }

  const risk = request.risk ?? "medium";

  return (
    <Confirmation
      approval={{ id: request.id }}
      className="mx-4 mb-3"
      state="approval-requested"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{PERMISSION_ICONS[request.type]}</div>
        <div className="min-w-0 flex-1">
          <ConfirmationTitle className="font-medium">
            {request.title}
          </ConfirmationTitle>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {request.description}
          </p>
          {request.details && (
            <pre className="mt-1 max-h-20 overflow-auto rounded bg-muted/50 p-1.5 text-[11px] text-muted-foreground">
              {request.details}
            </pre>
          )}
        </div>
      </div>

      <ConfirmationRequest>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className={cn("size-3", RISK_STYLES[risk])} />
              <span className={cn("text-xs", RISK_STYLES[risk])}>
                风险: {RISK_LABELS[risk]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                checked={rememberInSession}
                id="agent-confirm-remember"
                onCheckedChange={(checked) =>
                  setRememberInSession(checked === true)
                }
              />
              <Label
                className="cursor-pointer text-xs"
                htmlFor="agent-confirm-remember"
              >
                本次会话始终允许
              </Label>
            </div>
          </div>
          <ConfirmationActions>
            <ConfirmationAction
              onClick={() => onDeny?.(request)}
              variant="outline"
            >
              拒绝
            </ConfirmationAction>
            <ConfirmationAction
              onClick={() => onAllow?.({ ...request, rememberInSession })}
            >
              允许
            </ConfirmationAction>
          </ConfirmationActions>
        </div>
      </ConfirmationRequest>
    </Confirmation>
  );
}

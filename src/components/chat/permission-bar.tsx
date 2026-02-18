import { useState } from "react";
import type { PermissionRequest } from "@/components/chat/permission-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PermissionBarProps {
  request: PermissionRequest | null;
  onAllow?: (request: PermissionRequest) => void;
  onDeny?: (request: PermissionRequest) => void;
}

export function PermissionBar({
  request,
  onAllow,
  onDeny,
}: PermissionBarProps) {
  const [rememberInSession, setRememberInSession] = useState(false);

  if (!request) {
    return null;
  }

  return (
    <div className="border-t bg-muted/40 px-3 py-2">
      <div className="flex flex-col gap-2">
        <div className="text-xs">
          <div className="font-medium">{request.title}</div>
          <div className="text-muted-foreground">{request.description}</div>
          {request.details && (
            <div className="truncate text-muted-foreground/90">
              {request.details}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={rememberInSession}
              id="permission-remember"
              onCheckedChange={(checked) =>
                setRememberInSession(checked === true)
              }
            />
            <Label
              className="cursor-pointer text-xs"
              htmlFor="permission-remember"
            >
              本次会话始终允许此类操作
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onDeny?.(request)}
              size="sm"
              type="button"
              variant="outline"
            >
              拒绝
            </Button>
            <Button
              onClick={() =>
                onAllow?.({
                  ...request,
                  rememberInSession,
                })
              }
              size="sm"
              type="button"
            >
              允许
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

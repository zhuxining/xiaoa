import type { PermissionRequest } from "@/components/chat/permission-dialog";

export interface AdaptedConfirmation {
  decision?: "allow" | "deny";
  description: string;
  details?: string;
  id: string;
  rememberInSession?: boolean;
  risk?: "low" | "medium" | "high";
  title: string;
}

export function toConfirmationProps(
  request: PermissionRequest | null
): AdaptedConfirmation | null {
  if (!request) {
    return null;
  }

  return {
    id: request.id,
    title: request.title,
    description: request.description,
    details: request.details,
    risk: request.risk,
    rememberInSession: request.rememberInSession,
  };
}

export function createPermissionResponse(
  request: PermissionRequest,
  decision: "allow" | "deny",
  rememberInSession: boolean
): PermissionRequest & { decision: "allow" | "deny" } {
  return {
    ...request,
    decision,
    rememberInSession,
  };
}

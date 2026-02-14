import { AlertTriangle, FileText, Globe, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

export type PermissionType = "file_read" | "file_write" | "execute" | "network";

export interface PermissionRequest {
  id: string;
  type: PermissionType;
  title: string;
  description: string;
  details?: string;
  risk?: "low" | "medium" | "high";
}

interface PermissionDialogProps {
  request: PermissionRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: (request: PermissionRequest) => void;
  onDeny: (request: PermissionRequest) => void;
  className?: string;
}

const PERMISSION_CONFIG: Record<
  PermissionType,
  { icon: React.ReactNode; defaultRisk: NonNullable<PermissionRequest["risk"]> }
> = {
  file_read: {
    icon: <FileText className="size-4" />,
    defaultRisk: "low",
  },
  file_write: {
    icon: <FileText className="size-4" />,
    defaultRisk: "medium",
  },
  execute: {
    icon: <Shield className="size-4" />,
    defaultRisk: "high",
  },
  network: {
    icon: <Globe className="size-4" />,
    defaultRisk: "medium",
  },
};

const RISK_STYLES: Record<NonNullable<PermissionRequest["risk"]>, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
};

export function PermissionDialog({
  request,
  open,
  onOpenChange,
  onAllow,
  onDeny,
  className,
}: PermissionDialogProps) {
  if (!request) {
    return null;
  }

  const config = PERMISSION_CONFIG[request.type];
  const risk = request.risk ?? config.defaultRisk;

  const handleAllow = () => {
    onAllow(request);
    onOpenChange(false);
  };

  const handleDeny = () => {
    onDeny(request);
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className={cn("max-w-md", className)}>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-muted">
            {config.icon}
          </AlertDialogMedia>
          <AlertDialogTitle>{request.title}</AlertDialogTitle>
          <AlertDialogDescription>{request.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {request.details && (
          <ScrollArea className="max-h-32 rounded-md border bg-muted/50 p-2">
            <pre className="whitespace-pre-wrap text-xs">{request.details}</pre>
          </ScrollArea>
        )}

        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("size-4", RISK_STYLES[risk])} />
          <span className={cn("text-xs", RISK_STYLES[risk])}>
            风险等级：
            {risk === "low" && "低"}
            {risk === "medium" && "中"}
            {risk === "high" && "高"}
          </span>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDeny}>拒绝</AlertDialogCancel>
          <AlertDialogAction onClick={handleAllow}>允许</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/tailwind";

export interface Knowledge {
  id: string;
  name: string;
  type: "file" | "url";
  source: string;
  status: "ready" | "processing" | "error";
  createdAt: Date;
}

interface KnowledgeCardProps {
  knowledge: Knowledge;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export function KnowledgeCard({
  knowledge,
  isSelected,
  onClick,
  className,
}: KnowledgeCardProps) {
  const getStatusLabel = (status: Knowledge["status"]) => {
    switch (status) {
      case "ready":
        return "就绪";
      case "processing":
        return "处理中";
      case "error":
        return "错误";
      default:
        return "未知";
    }
  };

  const getStatusVariant = (
    status: Knowledge["status"]
  ): "success" | "processing" | "error" => {
    switch (status) {
      case "ready":
        return "success";
      case "processing":
        return "processing";
      case "error":
        return "error";
      default:
        return "processing";
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer p-3 transition-colors hover:bg-muted",
        isSelected && "bg-muted ring-1 ring-primary",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">
              {knowledge.name}
            </span>
            <StatusBadge status={getStatusVariant(knowledge.status)}>
              {getStatusLabel(knowledge.status)}
            </StatusBadge>
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {knowledge.type === "file" ? "文件" : "网页"}
          </p>
        </div>
      </div>
    </Card>
  );
}

import { ExternalLink, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Knowledge } from "./knowledge-card";

interface KnowledgeDetailProps {
  knowledge: Knowledge | null;
  onDelete: () => void;
  onOpenUrl?: () => void;
  className?: string;
}

export function KnowledgeDetail({
  knowledge,
  onDelete,
  onOpenUrl,
  className,
}: KnowledgeDetailProps) {
  if (!knowledge) {
    return (
      <div
        className={`flex h-full items-center justify-center text-muted-foreground ${className || ""}`}
      >
        选择一条知识查看详情
      </div>
    );
  }

  const getStatusLabel = (status: Knowledge["status"]) => {
    switch (status) {
      case "ready":
        return "就绪";
      case "pending":
        return "待处理";
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
      case "pending":
        return "processing";
      case "error":
        return "error";
      default:
        return "processing";
    }
  };

  return (
    <ScrollArea className={className}>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">{knowledge.name}</h2>
          <div className="flex gap-2">
            {knowledge.type === "url" && onOpenUrl && (
              <Button onClick={onOpenUrl} size="icon-sm" variant="outline">
                <ExternalLink className="size-3" />
              </Button>
            )}
            <Button onClick={onDelete} size="icon-sm" variant="destructive">
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">类型</span>
            <span>{knowledge.type === "file" ? "文件" : "网页"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">来源</span>
            <span className="max-w-48 truncate">{knowledge.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">状态</span>
            <StatusBadge status={getStatusVariant(knowledge.status)}>
              {getStatusLabel(knowledge.status)}
            </StatusBadge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">添加时间</span>
            <span>{new Date(knowledge.addedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

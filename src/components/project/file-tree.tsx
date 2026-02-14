import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type FileNode, FileTreeItem } from "./file-tree-item";

export type { FileNode } from "./file-tree-item";

interface FileTreeProps {
  nodes: FileNode[];
  selectedId?: string;
  onSelect?: (node: FileNode) => void;
  className?: string;
}

export function FileTree({
  nodes,
  selectedId,
  onSelect,
  className,
}: FileTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ScrollArea className={className}>
      <div className="flex flex-col gap-0.5 p-2">
        {nodes.map((node) => (
          <FileTreeItem
            expandedIds={expandedIds}
            key={node.id}
            node={node}
            onSelect={onSelect}
            onToggleExpand={handleToggleExpand}
            selectedId={selectedId}
          />
        ))}
        {nodes.length === 0 && (
          <div className="py-4 text-center text-muted-foreground text-xs">
            空目录
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

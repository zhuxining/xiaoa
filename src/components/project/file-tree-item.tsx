import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/utils/tailwind";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface FileTreeItemProps {
  node: FileNode;
  depth?: number;
  selectedId?: string;
  onSelect?: (node: FileNode) => void;
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
  className?: string;
}

export function FileTreeItem({
  node,
  depth = 0,
  selectedId,
  onSelect,
  expandedIds = new Set(),
  onToggleExpand,
  className,
}: FileTreeItemProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder && onToggleExpand) {
      onToggleExpand(node.id);
    }
    onSelect?.(node);
  };

  const _getIcon = () => {
    if (!isFolder) {
      return <File className="size-3.5 shrink-0 text-muted-foreground" />;
    }
    return isExpanded ? (
      <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <Folder className="size-3.5 shrink-0 text-muted-foreground" />
    );
  };

  return (
    <div className={className}>
      <button
        className={cn(
          "flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-muted",
          isSelected && "bg-muted"
        )}
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        type="button"
      >
        {isFolder && (
          <span className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-3" />}
        {_getIcon()}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              depth={depth + 1}
              expandedIds={expandedIds}
              key={child.id}
              node={child}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

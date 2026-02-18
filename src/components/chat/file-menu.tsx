import { File, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

export interface FileMenuItem {
  id: string;
  name: string;
  path: string;
}

interface FileMenuProps {
  files: FileMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: FileMenuItem) => void;
  anchor?: React.ReactNode;
  className?: string;
}

export function FileMenu({
  files,
  open,
  onOpenChange,
  onSelect,
  anchor,
  className,
}: FileMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredFiles = files.filter((file) => {
    const query = search.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredFiles.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredFiles[selectedIndex]) {
          onSelect(filteredFiles[selectedIndex]);
          onOpenChange(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        onOpenChange(false);
        break;
      default:
        break;
    }
  };

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent
        align="start"
        className={cn("w-80 p-0", className)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        side="top"
      >
        <div className="border-b px-2 py-1.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="size-3" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索文件..."
              type="text"
              value={search}
            />
          </div>
        </div>
        <ScrollArea className="max-h-56">
          <div className="p-1">
            {filteredFiles.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-xs">
                未找到匹配文件
              </div>
            ) : (
              filteredFiles.map((file, index) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    index === selectedIndex ? "bg-muted" : "hover:bg-muted"
                  )}
                  key={file.id}
                  onClick={() => {
                    onSelect(file);
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <File className="size-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="truncate text-muted-foreground">
                      {file.path}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

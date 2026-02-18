import { Search, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

export interface SkillMenuItem {
  argumentHint?: string;
  description: string;
  icon?: React.ReactNode;
  id: string;
  name: string;
}

interface SkillMenuProps {
  anchor?: React.ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (skill: SkillMenuItem) => void;
  open: boolean;
  skills: SkillMenuItem[];
}

export function SkillMenu({
  skills,
  open,
  onOpenChange,
  onSelect,
  anchor,
  className,
}: SkillMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, []);

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
          prev < filteredSkills.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredSkills[selectedIndex]) {
          onSelect(filteredSkills[selectedIndex]);
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
        className={cn("w-64 p-0", className)}
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
              placeholder="搜索技能..."
              type="text"
              value={search}
            />
          </div>
        </div>
        <ScrollArea className="max-h-48">
          <div className="p-1" ref={listRef}>
            {filteredSkills.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-xs">
                未找到匹配的技能
              </div>
            ) : (
              filteredSkills.map((skill, index) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    index === selectedIndex ? "bg-muted" : "hover:bg-muted"
                  )}
                  key={skill.id}
                  onClick={() => {
                    onSelect(skill);
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <div className="flex size-5 items-center justify-center rounded bg-muted">
                    {skill.icon || <Wrench className="size-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{skill.name}</div>
                    <div className="truncate text-muted-foreground">
                      {skill.description}
                    </div>
                    {skill.argumentHint && (
                      <div className="truncate text-[10px] text-muted-foreground/80">
                        {skill.argumentHint}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="border-t px-2 py-1 text-[10px] text-muted-foreground">
          ↑↓ 选择 · Enter 确认 · Esc 关闭
        </div>
      </PopoverContent>
    </Popover>
  );
}

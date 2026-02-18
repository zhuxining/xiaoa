import { ScrollArea } from "@/components/ui/scroll-area";
import { type Knowledge, KnowledgeCard } from "./knowledge-card";

interface KnowledgeListProps {
  className?: string;
  knowledge: Knowledge[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function KnowledgeList({
  knowledge,
  selectedId,
  onSelect,
  className,
}: KnowledgeListProps) {
  return (
    <ScrollArea className={className}>
      <div className="flex flex-col gap-2 p-4">
        {knowledge.map((item) => (
          <KnowledgeCard
            isSelected={item.id === selectedId}
            key={item.id}
            knowledge={item}
            onClick={() => onSelect(item.id)}
          />
        ))}
        {knowledge.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            暂无知识
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

interface MemoryEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MemoryEditor({
  value,
  onChange,
  placeholder = "Agent 会自动将重要信息保存到这里...\n\n你也可以手动编辑记忆内容。",
  disabled = false,
  className,
}: MemoryEditorProps) {
  return (
    <div
      className={cn("flex h-full flex-col", className)}
      data-slot="memory-editor"
    >
      <ScrollArea className="flex-1">
        <MarkdownEditor
          disabled={disabled}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      </ScrollArea>
      <div className="border-t px-4 py-2 text-muted-foreground text-xs">
        记忆内容会自动注入到 Agent 的上下文中
      </div>
    </div>
  );
}

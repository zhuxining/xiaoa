import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/tailwind";
import { SkillMenu, type SkillMenuItem } from "./skill-menu";

const _TRAILING_SLASH_REGEX = /\/$/;

interface MessageInputProps {
  onSend: (message: string) => void;
  onAbort?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
  disabled?: boolean;
  skills?: SkillMenuItem[];
  onSkillSelect?: (skill: SkillMenuItem) => void;
  className?: string;
}

export function MessageInput({
  onSend,
  onAbort,
  isGenerating = false,
  placeholder = "输入消息... (/ 调用技能)",
  disabled = false,
  skills = [],
  onSkillSelect,
  className,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled && !isGenerating) {
      onSend(trimmed);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showSkillMenu) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // 检测 "/" 触发技能菜单
    if (newValue.endsWith("/") && skills.length > 0) {
      setShowSkillMenu(true);
    } else if (showSkillMenu && !newValue.includes("/")) {
      setShowSkillMenu(false);
    }
  };

  const handleSkillSelect = (skill: SkillMenuItem) => {
    // 移除末尾的 "/" 并替换为技能名称
    setValue((prev) => {
      const withoutSlash = prev.replace(_TRAILING_SLASH_REGEX, "");
      return `${withoutSlash}@${skill.name} `;
    });
    setShowSkillMenu(false);
    onSkillSelect?.(skill);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <div
      className={cn("border-t bg-background p-4", className)}
      data-slot="message-input"
    >
      <SkillMenu
        anchor={<span />}
        onOpenChange={setShowSkillMenu}
        onSelect={handleSkillSelect}
        open={showSkillMenu}
        skills={skills}
      />
      <div className="flex items-end gap-2">
        <Textarea
          className="max-h-32 min-h-9 flex-1 resize-none"
          disabled={disabled || isGenerating}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          rows={1}
          value={value}
        />
        {isGenerating ? (
          <Button
            disabled={!onAbort}
            onClick={onAbort}
            size="icon"
            variant="destructive"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            disabled={!value.trim() || disabled}
            onClick={handleSubmit}
            size="icon"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      {skills.length > 0 && (
        <div className="mt-1 text-muted-foreground text-xs">
          输入 / 快速调用技能
        </div>
      )}
    </div>
  );
}

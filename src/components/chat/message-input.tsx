import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/tailwind";
import { FileMenu, type FileMenuItem } from "./file-menu";
import { SkillMenu, type SkillMenuItem } from "./skill-menu";

const _TRAILING_SLASH_REGEX = /\/$/;
const _TRAILING_AT_REGEX = /@$/;
const MAX_HISTORY_SIZE = 50;
const MAX_INPUT_LENGTH = 128_000;

interface MessageInputProps {
  className?: string;
  disabled?: boolean;
  files?: FileMenuItem[];
  isGenerating?: boolean;
  onAbort?: () => void;
  onSend: (message: string) => void;
  onSkillSelect?: (skill: SkillMenuItem) => void;
  placeholder?: string;
  skills?: SkillMenuItem[];
}

export function MessageInput({
  onSend,
  onAbort,
  isGenerating = false,
  placeholder = "输入消息... (/ 调用技能)",
  disabled = false,
  skills = [],
  files = [],
  onSkillSelect,
  className,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillMenuItem | null>(
    null
  );
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const isNearLimit = charCount > MAX_INPUT_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_INPUT_LENGTH;

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled && !isGenerating && !isOverLimit) {
      onSend(trimmed);
      // 保存到历史记录
      setInputHistory((prev) => {
        const newHistory = [trimmed, ...prev.filter((h) => h !== trimmed)];
        return newHistory.slice(0, MAX_HISTORY_SIZE);
      });
      setHistoryIndex(-1);
      setValue("");
      setSelectedSkill(null);
      requestAnimationFrame(resizeTextarea);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 上下箭头浏览历史（当输入框为空或在行首/行尾时）
    if (
      e.key === "ArrowUp" &&
      (value === "" || textareaRef.current?.selectionStart === 0)
    ) {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        setHistoryIndex(newIndex);
        setValue(inputHistory[newIndex] ?? "");
      }
    } else if (e.key === "ArrowDown" && historyIndex >= 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setValue("");
      } else {
        setHistoryIndex(newIndex);
        setValue(inputHistory[newIndex] ?? "");
      }
    } else if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !showSkillMenu &&
      !showFileMenu
    ) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    // 重置历史索引
    if (historyIndex >= 0) {
      setHistoryIndex(-1);
    }
    requestAnimationFrame(resizeTextarea);

    // 检测 "/" 触发技能菜单
    if (newValue.endsWith("/") && skills.length > 0) {
      setShowSkillMenu(true);
    } else if (showSkillMenu && !newValue.includes("/")) {
      setShowSkillMenu(false);
    }

    // 检测 "@" 触发文件菜单
    if (newValue.endsWith("@") && files.length > 0) {
      setShowFileMenu(true);
    } else if (showFileMenu && !newValue.includes("@")) {
      setShowFileMenu(false);
    }

    if (selectedSkill && !newValue.includes(`/${selectedSkill.name}`)) {
      setSelectedSkill(null);
    }
  };

  const handleSkillSelect = (skill: SkillMenuItem) => {
    // 移除末尾的 "/" 并替换为技能名称
    setValue((prev) => {
      const withoutSlash = prev.replace(_TRAILING_SLASH_REGEX, "");
      return `${withoutSlash}/${skill.name} `;
    });
    setShowSkillMenu(false);
    setSelectedSkill(skill);
    onSkillSelect?.(skill);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (file: FileMenuItem) => {
    setValue((prev) => {
      const withoutAt = prev.replace(_TRAILING_AT_REGEX, "");
      return `${withoutAt}@${file.path} `;
    });
    setShowFileMenu(false);
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
      <FileMenu
        anchor={<span />}
        files={files}
        onOpenChange={setShowFileMenu}
        onSelect={handleFileSelect}
        open={showFileMenu}
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            className={cn(
              "max-h-32 min-h-9 resize-none",
              isOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={disabled || isGenerating}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={value}
          />
          {/* 字符计数 */}
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-muted-foreground">
              {skills.length > 0 && "输入 / 调用技能，输入 @ 引用文件"}
              {selectedSkill?.argumentHint && (
                <span className="ml-2">
                  参数提示: {selectedSkill.argumentHint}
                </span>
              )}
            </span>
            <span
              className={cn(
                "text-muted-foreground",
                isNearLimit && !isOverLimit && "text-yellow-500",
                isOverLimit && "text-destructive"
              )}
            >
              {charCount.toLocaleString()}/{MAX_INPUT_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>
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
            disabled={!value.trim() || disabled || isOverLimit}
            onClick={handleSubmit}
            size="icon"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

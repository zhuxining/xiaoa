import type { KeyboardEvent } from "react";
import { useCallback, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/utils/tailwind";
import { toChatStatus } from "./adapters/input-adapter";
import { FileMenu, type FileMenuItem } from "./file-menu";
import { SkillMenu, type SkillMenuItem } from "./skill-menu";

const _TRAILING_SLASH_REGEX = /\/$/;
const _TRAILING_AT_REGEX = /@$/;
const MAX_HISTORY_SIZE = 50;
const MAX_INPUT_LENGTH = 128_000;

interface AgentPromptInputProps {
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

export function AgentPromptInput({
  onSend,
  onAbort,
  isGenerating = false,
  placeholder = "输入消息... (/ 调用技能)",
  disabled = false,
  skills = [],
  files = [],
  onSkillSelect,
  className,
}: AgentPromptInputProps) {
  const [value, setValue] = useState("");
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillMenuItem | null>(
    null
  );
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const charCount = value.length;
  const isNearLimit = charCount > MAX_INPUT_LENGTH * 0.9;
  const isOverLimit = charCount > MAX_INPUT_LENGTH;

  const chatStatus = toChatStatus(isGenerating, disabled);

  const handleSubmit = useCallback(
    (message: { text: string }) => {
      const trimmed = message.text.trim();
      if (trimmed && !disabled && !isGenerating && !isOverLimit) {
        onSend(trimmed);
        setInputHistory((prev) => {
          const newHistory = [trimmed, ...prev.filter((h) => h !== trimmed)];
          return newHistory.slice(0, MAX_HISTORY_SIZE);
        });
        setHistoryIndex(-1);
        setValue("");
        setSelectedSkill(null);
      }
    },
    [disabled, isGenerating, isOverLimit, onSend]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // History navigation
      if (
        e.key === "ArrowUp" &&
        (value === "" || e.currentTarget.selectionStart === 0)
      ) {
        if (inputHistory.length > 0 && !showSkillMenu && !showFileMenu) {
          e.preventDefault();
          const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
          setHistoryIndex(newIndex);
          setValue(inputHistory[newIndex] ?? "");
        }
      } else if (
        e.key === "ArrowDown" &&
        historyIndex >= 0 &&
        !showSkillMenu &&
        !showFileMenu
      ) {
        e.preventDefault();
        const newIndex = historyIndex - 1;
        if (newIndex < 0) {
          setHistoryIndex(-1);
          setValue("");
        } else {
          setHistoryIndex(newIndex);
          setValue(inputHistory[newIndex] ?? "");
        }
      }

      // Block Enter submit when menus are open
      if (e.key === "Enter" && !e.shiftKey && (showSkillMenu || showFileMenu)) {
        e.preventDefault();
      }
    },
    [value, inputHistory, historyIndex, showSkillMenu, showFileMenu]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      if (historyIndex >= 0) {
        setHistoryIndex(-1);
      }

      // "/" triggers skill menu
      if (newValue.endsWith("/") && skills.length > 0) {
        setShowSkillMenu(true);
      } else if (showSkillMenu && !newValue.includes("/")) {
        setShowSkillMenu(false);
      }

      // "@" triggers file menu
      if (newValue.endsWith("@") && files.length > 0) {
        setShowFileMenu(true);
      } else if (showFileMenu && !newValue.includes("@")) {
        setShowFileMenu(false);
      }

      if (selectedSkill && !newValue.includes(`/${selectedSkill.name}`)) {
        setSelectedSkill(null);
      }
    },
    [
      historyIndex,
      skills.length,
      files.length,
      showSkillMenu,
      showFileMenu,
      selectedSkill,
    ]
  );

  const handleSkillSelect = useCallback(
    (skill: SkillMenuItem) => {
      setValue((prev) => {
        const withoutSlash = prev.replace(_TRAILING_SLASH_REGEX, "");
        return `${withoutSlash}/${skill.name} `;
      });
      setShowSkillMenu(false);
      setSelectedSkill(skill);
      onSkillSelect?.(skill);
    },
    [onSkillSelect]
  );

  const handleFileSelect = useCallback((file: FileMenuItem) => {
    setValue((prev) => {
      const withoutAt = prev.replace(_TRAILING_AT_REGEX, "");
      return `${withoutAt}@${file.path} `;
    });
    setShowFileMenu(false);
  }, []);

  const menuAnchor = <span ref={anchorRef} />;

  return (
    <div
      className={cn("border-t bg-background px-4 py-3", className)}
      data-slot="agent-prompt-input"
    >
      {menuAnchor}
      <SkillMenu
        anchor={menuAnchor}
        onOpenChange={setShowSkillMenu}
        onSelect={handleSkillSelect}
        open={showSkillMenu}
        skills={skills}
      />
      <FileMenu
        anchor={menuAnchor}
        files={files}
        onOpenChange={setShowFileMenu}
        onSelect={handleFileSelect}
        open={showFileMenu}
      />
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          className={cn(
            isOverLimit && "border-destructive focus-visible:ring-destructive"
          )}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={value}
        />
        <PromptInputFooter>
          <PromptInputTools>
            <span className="text-muted-foreground text-xs">
              {skills.length > 0 && "/ 技能 · @ 文件"}
              {selectedSkill?.argumentHint && (
                <span className="ml-2">参数: {selectedSkill.argumentHint}</span>
              )}
            </span>
            <span
              className={cn(
                "ml-auto text-muted-foreground text-xs",
                isNearLimit && !isOverLimit && "text-yellow-500",
                isOverLimit && "text-destructive"
              )}
            >
              {charCount.toLocaleString()}/{MAX_INPUT_LENGTH.toLocaleString()}
            </span>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!value.trim() || disabled || isOverLimit}
            onStop={onAbort}
            status={chatStatus}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

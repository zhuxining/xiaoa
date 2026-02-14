import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Skill } from "./skill-card";

interface SkillEditorProps {
  skill: Skill | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Skill>) => void;
  onEditToggle: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
}

export function SkillEditor({
  skill,
  isEditing,
  onUpdate,
  onEditToggle,
  onDelete,
  onSave,
  onCancel,
  className,
}: SkillEditorProps) {
  if (!skill) {
    return (
      <div
        className={`flex h-full items-center justify-center text-muted-foreground ${className || ""}`}
      >
        选择一个技能查看详情
      </div>
    );
  }

  return (
    <ScrollArea className={className}>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">{skill.name}</h2>
          <div className="flex gap-2">
            <Button onClick={onEditToggle} size="icon-sm" variant="outline">
              <Pencil className="size-3" />
            </Button>
            <Button onClick={onDelete} size="icon-sm" variant="destructive">
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        <Field>
          <FieldLabel>名称</FieldLabel>
          <Input
            disabled={!isEditing}
            onChange={(e) => onUpdate({ name: e.target.value })}
            value={skill.name}
          />
        </Field>

        <Field>
          <FieldLabel>描述</FieldLabel>
          <Input
            disabled={!isEditing}
            onChange={(e) => onUpdate({ description: e.target.value })}
            value={skill.description}
          />
        </Field>

        <Field>
          <FieldLabel>提示词</FieldLabel>
          <Textarea
            disabled={!isEditing}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            rows={8}
            value={skill.prompt}
          />
        </Field>

        <Field>
          <FieldLabel>状态</FieldLabel>
          <div className="flex items-center gap-2">
            <Button
              disabled={!isEditing}
              onClick={() => onUpdate({ enabled: true })}
              size="sm"
              variant={skill.enabled ? "default" : "outline"}
            >
              启用
            </Button>
            <Button
              disabled={!isEditing}
              onClick={() => onUpdate({ enabled: false })}
              size="sm"
              variant={skill.enabled ? "outline" : "secondary"}
            >
              禁用
            </Button>
          </div>
        </Field>

        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button onClick={onCancel} variant="outline">
              取消
            </Button>
            <Button onClick={onSave}>保存</Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

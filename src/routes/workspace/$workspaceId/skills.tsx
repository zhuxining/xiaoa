import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Skill } from "@/actions/skill";
import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
} from "@/actions/skill";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SkillEditor } from "@/components/workspace/skill-editor";
import { SkillList } from "@/components/workspace/skill-list";

function SkillsPage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();

  // 加载技能列表
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["skills", workspaceId],
    queryFn: () => getSkills(workspaceId),
  });

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null;

  // 创建技能 mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createSkill({
        workspaceId,
        name: "新技能",
        prompt: "",
        description: "",
      }),
    onSuccess: (newSkill) => {
      queryClient.invalidateQueries({ queryKey: ["skills", workspaceId] });
      setSelectedSkillId(newSkill.id);
      setIsEditing(true);
      toast.success("技能创建成功");
    },
    onError: (error) => {
      toast.error(`创建失败: ${(error as Error).message}`);
    },
  });

  // 更新技能 mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Skill>) => {
      if (!selectedSkillId) {
        throw new Error("No skill selected");
      }
      return updateSkill({
        id: selectedSkillId,
        workspaceId,
        ...updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills", workspaceId] });
    },
  });

  // 删除技能 mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!selectedSkillId) {
        throw new Error("No skill selected");
      }
      return deleteSkill(workspaceId, selectedSkillId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["skills", workspaceId] });
      if (result.success) {
        setSelectedSkillId(
          skills.find((s) => s.id !== selectedSkillId)?.id ?? null
        );
        setIsEditing(false);
        toast.success("技能已删除");
      }
    },
    onError: (error) => {
      toast.error(`删除失败: ${(error as Error).message}`);
    },
  });

  const handleSkillUpdate = (updates: Partial<Skill>) => {
    updateMutation.mutate(updates);
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("技能已保存");
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleCreate = () => {
    createMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 size-4" />
              导入
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={handleCreate}
              size="sm"
            >
              {createMutation.isPending && (
                <Loader2 className="mr-1 size-4 animate-spin" />
              )}
              <Plus className="mr-1 size-4" />
              新建
            </Button>
          </div>
        }
        description="管理和配置 Agent 技能"
        title="技能管理"
      />
      <ResizablePanelGroup className="flex-1" orientation="horizontal">
        <ResizablePanel defaultSize={35} minSize={25}>
          <SkillList
            className="h-full"
            onSkillSelect={(id) => {
              setSelectedSkillId(id);
              setIsEditing(false);
            }}
            selectedSkillId={selectedSkillId}
            skills={skills}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65}>
          <SkillEditor
            className="h-full"
            isEditing={isEditing}
            onCancel={() => setIsEditing(false)}
            onDelete={handleDelete}
            onEditToggle={() => setIsEditing(!isEditing)}
            onSave={handleSave}
            onUpdate={handleSkillUpdate}
            skill={selectedSkill}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/skills")({
  component: SkillsPage,
});

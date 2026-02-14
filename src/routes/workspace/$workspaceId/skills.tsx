import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { Skill } from "@/components/workspace/skill-card";
import { SkillEditor } from "@/components/workspace/skill-editor";
import { SkillList } from "@/components/workspace/skill-list";

const MOCK_SKILLS: Skill[] = [
  {
    id: "1",
    name: "搜索网页",
    description: "搜索互联网获取最新信息",
    prompt: "使用搜索引擎搜索用户的问题...",
    enabled: true,
  },
  {
    id: "2",
    name: "分析文档",
    description: "分析和总结文档内容",
    prompt: "分析用户上传的文档...",
    enabled: true,
  },
];

function SkillsPage() {
  const { workspaceId } = Route.useParams();
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(
    skills[0]?.id || null
  );
  const [isEditing, setIsEditing] = useState(false);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null;

  const handleSkillUpdate = (updates: Partial<Skill>) => {
    if (!selectedSkillId) {
      return;
    }
    setSkills((prev) =>
      prev.map((s) => (s.id === selectedSkillId ? { ...s, ...updates } : s))
    );
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log("Saving skills:", { workspaceId, skills });
  };

  const handleDelete = () => {
    if (!selectedSkillId) {
      return;
    }
    setSkills((prev) => prev.filter((s) => s.id !== selectedSkillId));
    setSelectedSkillId(skills[0]?.id ?? null);
  };

  const handleCreate = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: "新技能",
      description: "",
      prompt: "",
      enabled: true,
    };
    setSkills((prev) => [...prev, newSkill]);
    setSelectedSkillId(newSkill.id);
    setIsEditing(true);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 size-4" />
              导入
            </Button>
            <Button onClick={handleCreate} size="sm">
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

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MemoryEditor } from "@/components/workspace/memory-editor";

const DEFAULT_MEMORY = `# 记忆

## 用户偏好
- 语言：中文
- 输出风格：简洁

## 项目信息
- 项目名称：小A
- 技术栈：Electron + React + TailwindCSS

## 重要事项
- 定期保存工作进度
- 注意代码规范
`;

function MemoriesPage() {
  const { workspaceId } = Route.useParams();
  const [memory, setMemory] = useState(DEFAULT_MEMORY);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: 实现保存逻辑
    console.log("Saving memory:", { workspaceId, memory });
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        }
        description="Agent 会自动将重要信息保存到这里"
        title="记忆"
      />
      <MemoryEditor className="flex-1" onChange={setMemory} value={memory} />
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/memories")({
  component: MemoriesPage,
});

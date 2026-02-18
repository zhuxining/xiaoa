import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMemory, saveMemory } from "@/actions/memory";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MemoryEditor } from "@/components/workspace/memory-editor";

function MemoriesPage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();

  // 加载记忆
  const { data: memory, isLoading } = useQuery({
    queryKey: ["memory", workspaceId],
    queryFn: () => getMemory(workspaceId),
  });

  // 本地编辑状态
  const [content, setContent] = useState("");

  // 同步服务器数据到本地状态
  useEffect(() => {
    if (memory?.content) {
      setContent(memory.content);
    }
  }, [memory]);

  // 检查是否有更改
  const hasChanges = memory?.content !== content;

  // 保存 mutation
  const saveMutation = useMutation({
    mutationFn: () => saveMemory(workspaceId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory", workspaceId] });
      toast.success("记忆已保存");
    },
    onError: (error) => {
      toast.error(`保存失败: ${(error as Error).message}`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
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
          <Button
            disabled={!hasChanges || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            保存
          </Button>
        }
        description="Agent 会自动将重要信息保存到这里"
        title="记忆"
      />
      <MemoryEditor className="flex-1" onChange={setContent} value={content} />
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/memories")({
  component: MemoriesPage,
});

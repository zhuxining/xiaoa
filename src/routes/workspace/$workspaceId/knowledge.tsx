import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  addKnowledge,
  deleteKnowledge,
  getKnowledge,
} from "@/actions/knowledge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { KnowledgeDetail } from "@/components/workspace/knowledge-detail";
import { KnowledgeList } from "@/components/workspace/knowledge-list";
import { KnowledgeUploader } from "@/components/workspace/knowledge-uploader";

function KnowledgePage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: knowledge = [] } = useQuery({
    queryKey: ["knowledge", workspaceId],
    queryFn: () => getKnowledge(workspaceId),
  });

  const selectedKnowledge = knowledge.find((k) => k.id === selectedId) ?? null;

  const addMutation = useMutation({
    mutationFn: addKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
    },
    onError: () => {
      toast.error("添加知识失败");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteKnowledge(workspaceId, id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    onError: () => {
      toast.error("删除知识失败");
    },
  });

  const handleFileSelect = (files: FileList) => {
    for (const file of Array.from(files)) {
      addMutation.mutate({
        workspaceId,
        name: file.name,
        type: "file",
        source: file.name,
      });
    }
  };

  const handleUrlSubmit = (url: string) => {
    addMutation.mutate({
      workspaceId,
      name: url.split("/").pop() || url,
      type: "url",
      source: url,
    });
  };

  const handleDelete = () => {
    if (!selectedId) {
      return;
    }
    deleteMutation.mutate({ id: selectedId });
  };

  const handleOpenUrl = () => {
    if (selectedKnowledge?.type === "url") {
      window.open(selectedKnowledge.source, "_blank");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            添加知识
          </Button>
        }
        description="管理 Agent 可以访问的知识"
        title="知识库"
      />
      <ResizablePanelGroup className="flex-1" orientation="horizontal">
        <ResizablePanel defaultSize={35} minSize={25}>
          <KnowledgeList
            className="h-full"
            knowledge={knowledge}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65}>
          <KnowledgeDetail
            className="h-full"
            knowledge={selectedKnowledge}
            onDelete={handleDelete}
            onOpenUrl={handleOpenUrl}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <div className="border-t p-4">
        <KnowledgeUploader
          onFileSelect={handleFileSelect}
          onUrlSubmit={handleUrlSubmit}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/knowledge")({
  component: KnowledgePage,
});

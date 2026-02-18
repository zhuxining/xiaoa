import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  addKnowledge,
  deleteKnowledge,
  getKnowledge,
  getKnowledgeContent,
  reparseKnowledge,
  selectKnowledgeFiles,
} from "@/actions/knowledge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { KnowledgeDetail } from "@/components/workspace/knowledge-detail";
import { KnowledgeList } from "@/components/workspace/knowledge-list";
import { KnowledgeUploader } from "@/components/workspace/knowledge-uploader";

const FILE_PATH_SPLIT_REGEX = /[\\/]/;

function KnowledgePage() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewContent, setPreviewContent] = useState("");

  const { data: knowledge = [] } = useQuery({
    queryKey: ["knowledge", workspaceId],
    queryFn: () => getKnowledge(workspaceId),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some(
        (item) => item.status === "pending" || item.status === "parsing"
      )
        ? 1500
        : false;
    },
  });

  const selectedKnowledge = knowledge.find((k) => k.id === selectedId) ?? null;

  const addMutation = useMutation({
    mutationFn: addKnowledge,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
      setSelectedId(item.id);
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

  const reparseMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => reparseKnowledge(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", workspaceId] });
      toast.success("已重新加入解析队列");
    },
    onError: () => {
      toast.error("重新解析失败");
    },
  });

  const handleFilePathsSelect = (paths: string[]) => {
    if (paths.length === 0) {
      toast.error("未检测到可用文件路径，请使用“选择文件”");
      return;
    }

    for (const path of paths) {
      addMutation.mutate({
        workspaceId,
        name: path.split(FILE_PATH_SPLIT_REGEX).pop() || path,
        sourceType: "local",
        originalPath: path,
      });
    }
  };

  const handlePickFiles = async () => {
    const paths = await selectKnowledgeFiles();
    handleFilePathsSelect(paths);
  };

  const handleUrlSubmit = (url: string) => {
    addMutation.mutate({
      workspaceId,
      name: url.split("/").pop() || url,
      sourceType: "url",
      originalUrl: url,
    });
  };

  const handleDelete = () => {
    if (!selectedId) {
      return;
    }
    deleteMutation.mutate({ id: selectedId });
  };

  const handleOpenUrl = () => {
    if (
      selectedKnowledge?.sourceType === "url" &&
      selectedKnowledge.originalUrl
    ) {
      window.open(selectedKnowledge.originalUrl, "_blank");
    }
  };

  const handlePreview = async () => {
    if (!selectedKnowledge) {
      return;
    }
    const result = await getKnowledgeContent(workspaceId, selectedKnowledge.id);
    if (!result) {
      toast.error("当前条目暂无可预览内容");
      return;
    }
    setPreviewTitle(selectedKnowledge.name);
    setPreviewContent(result.content);
    setPreviewOpen(true);
  };

  const handleReparse = () => {
    if (!selectedId) {
      return;
    }
    reparseMutation.mutate({ id: selectedId });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        actions={
          <Button onClick={handlePickFiles} size="sm">
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
            onPreview={handlePreview}
            onReparse={handleReparse}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <div className="border-t p-4">
        <KnowledgeUploader
          onDropWithoutPath={() =>
            toast.error("拖拽文件未获取到路径，请使用“选择文件”")
          }
          onFilePathsSelect={handleFilePathsSelect}
          onPickFiles={handlePickFiles}
          onUrlSubmit={handleUrlSubmit}
        />
      </div>
      <Dialog onOpenChange={setPreviewOpen} open={previewOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewTitle || "解析预览"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-md border p-3">
            <pre className="whitespace-pre-wrap text-xs">{previewContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/workspace/$workspaceId/knowledge")({
  component: KnowledgePage,
});

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
import type { Knowledge } from "@/components/workspace/knowledge-card";
import { KnowledgeDetail } from "@/components/workspace/knowledge-detail";
import { KnowledgeList } from "@/components/workspace/knowledge-list";
import { KnowledgeUploader } from "@/components/workspace/knowledge-uploader";

const MOCK_KNOWLEDGE: Knowledge[] = [
  {
    id: "1",
    name: "产品文档.pdf",
    type: "file",
    source: "/documents/product.pdf",
    status: "ready",
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "API 文档",
    type: "url",
    source: "https://api.example.com/docs",
    status: "ready",
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "用户手册.docx",
    type: "file",
    source: "/documents/manual.docx",
    status: "processing",
    createdAt: new Date(),
  },
];

function KnowledgePage() {
  const { workspaceId } = Route.useParams();
  const [knowledge, setKnowledge] = useState<Knowledge[]>(MOCK_KNOWLEDGE);
  const [selectedId, setSelectedId] = useState<string | null>(
    knowledge[0]?.id || null
  );

  const selectedKnowledge = knowledge.find((k) => k.id === selectedId) ?? null;

  const handleDelete = () => {
    if (!selectedId) {
      return;
    }
    setKnowledge((prev) => prev.filter((k) => k.id !== selectedId));
    setSelectedId(knowledge[0]?.id ?? null);
  };

  const handleFileSelect = (files: FileList) => {
    const newKnowledge: Knowledge[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      type: "file" as const,
      source: file.name,
      status: "processing" as const,
      createdAt: new Date(),
    }));
    setKnowledge((prev) => [...prev, ...newKnowledge]);
    console.log("Uploading files:", {
      workspaceId,
      files: Array.from(files).map((f) => f.name),
    });
  };

  const handleUrlSubmit = (url: string) => {
    const newKnowledge: Knowledge = {
      id: Date.now().toString(),
      name: url.split("/").pop() || url,
      type: "url",
      source: url,
      status: "processing",
      createdAt: new Date(),
    };
    setKnowledge((prev) => [...prev, newKnowledge]);
    console.log("Adding URL:", { workspaceId, url });
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

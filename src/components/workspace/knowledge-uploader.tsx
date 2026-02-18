import { FileText, Link, Upload } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KnowledgeUploaderProps {
  onFilePathsSelect: (paths: string[]) => void;
  onPickFiles: () => void;
  onDropWithoutPath?: () => void;
  onUrlSubmit: (url: string) => void;
  className?: string;
}

export function KnowledgeUploader({
  onFilePathsSelect,
  onPickFiles,
  onDropWithoutPath,
  onUrlSubmit,
  className,
}: KnowledgeUploaderProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      const paths = Array.from(files)
        .map((file) => (file as File & { path?: string }).path)
        .filter((path): path is string => typeof path === "string");
      if (paths.length > 0) {
        onFilePathsSelect(paths);
      } else if (files.length > 0) {
        onDropWithoutPath?.();
      }
    },
    [onFilePathsSelect, onDropWithoutPath]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const url = e.currentTarget.value.trim();
      if (url) {
        onUrlSubmit(url);
        e.currentTarget.value = "";
      }
    }
  };

  return (
    <div className={className} data-slot="knowledge-uploader">
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: drag-drop zone requires section with event handlers */}
      <section
        aria-label="文件拖放区域"
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-muted-foreground"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="mb-2 size-8" />
        <p className="mb-2 text-sm">拖放文件到此处</p>
        <p className="mb-3 text-xs">或</p>
        <div className="flex items-center gap-2">
          <Button onClick={onPickFiles} size="sm" variant="outline">
            <FileText className="mr-1 size-4" />
            选择文件
          </Button>
        </div>
      </section>
      <div className="mt-3 flex items-center gap-2">
        <Link className="size-4 shrink-0 text-muted-foreground" />
        <Input
          className="flex-1"
          onKeyDown={handleUrlKeyDown}
          placeholder="粘贴 URL 并按 Enter"
        />
      </div>
    </div>
  );
}

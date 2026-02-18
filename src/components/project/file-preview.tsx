import { File, FileCode, FileImage, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  content?: string;
  type: "text" | "code" | "image" | "binary" | "pdf";
  size?: number;
  lastModified?: Date;
}

interface FilePreviewProps {
  file: FileInfo | null;
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {
  if (!file) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center text-muted-foreground",
          className
        )}
      >
        <File className="mb-2 size-12 opacity-50" />
        <p className="text-sm">选择文件查看预览</p>
      </div>
    );
  }

  const getIcon = () => {
    switch (file.type) {
      case "code":
        return <FileCode className="size-5" />;
      case "image":
        return <FileImage className="size-5" />;
      case "text":
        return <FileText className="size-5" />;
      case "pdf":
        return <FileText className="size-5" />;
      default:
        return <File className="size-5" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) {
      return "未知";
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        {getIcon()}
        <span className="flex-1 truncate font-medium text-sm">{file.name}</span>
        {file.size && (
          <span className="text-muted-foreground text-xs">
            {formatSize(file.size)}
          </span>
        )}
      </div>
      <ScrollArea className="flex-1">
        {file.type === "image" && file.content && (
          <div className="flex items-center justify-center p-4">
            <img
              alt={file.name}
              className="max-h-full max-w-full object-contain"
              height="auto"
              src={file.content}
              width="100%"
            />
          </div>
        )}
        {file.type === "pdf" && file.content && (
          <div className="h-[calc(100vh-16rem)] p-2">
            <iframe
              className="h-full w-full rounded border"
              src={file.content}
              title={file.name}
            />
          </div>
        )}
        {file.type === "text" && file.content && (
          <pre className="overflow-x-auto p-4 text-xs">{file.content}</pre>
        )}
        {file.type === "code" && file.content && (
          <pre className="overflow-x-auto p-4 font-mono text-xs">
            <code>{file.content}</code>
          </pre>
        )}
        {file.type === "binary" && (
          <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
            <File className="mb-2 size-12 opacity-50" />
            <p className="text-sm">无法预览二进制文件</p>
          </div>
        )}
        {!file.content && file.type !== "binary" && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">无内容</p>
          </div>
        )}
      </ScrollArea>
      {file.lastModified && (
        <div className="border-t px-4 py-1 text-muted-foreground text-xs">
          修改时间: {file.lastModified.toLocaleString()}
        </div>
      )}
    </div>
  );
}

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted/50",
        className
      )}
      data-slot="code-block"
    >
      {language && (
        <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1.5 text-muted-foreground text-xs">
          <span>{language}</span>
          <Button
            className="size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleCopy}
            size="icon"
            variant="ghost"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-sm">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

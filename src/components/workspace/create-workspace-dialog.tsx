import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreateWorkspaceDialogProps {
  open: boolean;
  name: string;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onConfirm: () => void;
}

export function CreateWorkspaceDialog({
  open,
  name,
  isSubmitting,
  onOpenChange,
  onNameChange,
  onConfirm,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建工作区</DialogTitle>
          <DialogDescription>
            创建一个新的工作区来配置你的 Agent
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              }
            }}
            placeholder="工作区名称"
            value={name}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

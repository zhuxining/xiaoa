import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";

const statusBadgeVariants = cva("", {
  variants: {
    status: {
      default: "",
      success:
        "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
      warning:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
      info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      processing:
        "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  },
  defaultVariants: {
    status: "default",
  },
});

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(statusBadgeVariants({ status }), className)}
      data-slot="status-badge"
      variant="outline"
    >
      {children}
    </Badge>
  );
}

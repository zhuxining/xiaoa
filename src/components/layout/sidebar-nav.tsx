import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

interface SidebarNavProps {
  items: NavItem[];
  title?: string;
  action?: ReactNode;
}

export function SidebarNav({ items, title, action }: SidebarNavProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1" data-slot="sidebar-nav">
      {title && (
        <div className="flex items-center px-2 py-1.5">
          <span className="flex-1 font-medium text-muted-foreground text-xs">
            {title}
          </span>
          {action}
        </div>
      )}
      {items.map((item) => {
        const isActive =
          pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>
              <Link to={item.to}>
                <Button
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "bg-muted"
                  )}
                  size="sm"
                  variant={isActive ? "secondary" : "ghost"}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

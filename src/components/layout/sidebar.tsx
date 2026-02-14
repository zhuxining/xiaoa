import type React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/tailwind";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-56 flex-col border-r bg-sidebar text-sidebar-foreground",
        className
      )}
      data-slot="sidebar"
    >
      {children}
    </aside>
  );
}

interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div
      className={cn("flex flex-col gap-2 p-3", className)}
      data-slot="sidebar-header"
    >
      {children}
    </div>
  );
}

interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <ScrollArea className={cn("flex-1", className)} data-slot="sidebar-content">
      <div className="flex flex-col gap-1 p-2">{children}</div>
    </ScrollArea>
  );
}

interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn("border-t p-3", className)} data-slot="sidebar-footer">
      {children}
    </div>
  );
}

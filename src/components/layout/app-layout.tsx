import type React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";

interface AppLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ sidebar, children, className }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <div
        className={cn("flex h-screen flex-col overflow-hidden", className)}
        data-slot="app-layout"
      >
        {/* Main content area with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {sidebar}
          <main className="flex flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

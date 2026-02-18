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
      {/* Fixed 透明拖拽覆盖层全宽铺开。需要交互的元素加 relative z-50 nodraglayer 即可穿透 */}
      <div className="draglayer fixed top-0 right-0 left-0 z-40 h-9" />

      <div
        className={cn("flex h-screen flex-col overflow-hidden", className)}
        data-slot="app-layout"
      >
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

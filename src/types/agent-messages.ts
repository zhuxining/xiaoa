/**
 * Custom AgentMessage types for xiaoa.
 * Uses declaration merging to extend pi-agent-core's AgentMessage union.
 */
import type { PermissionRisk, PermissionType } from "@/ipc/chat/schemas";

export interface PermissionRequestMessage {
  permissionDescription: string;
  permissionDetails: string;
  permissionId: string;
  permissionRisk: PermissionRisk;
  permissionTitle: string;
  permissionType: PermissionType;
  role: "permission_request";
  timestamp: number;
}

export interface CompactionSummaryMessage {
  flushedMessageCount: number;
  role: "compaction_summary";
  summary: string;
  timestamp: number;
}

export interface MemoryUpdateMessage {
  content: string;
  role: "memory_update";
  timestamp: number;
}

declare module "@mariozechner/pi-agent-core" {
  interface CustomAgentMessages {
    compaction_summary: CompactionSummaryMessage;
    memory_update: MemoryUpdateMessage;
    permission_request: PermissionRequestMessage;
  }
}

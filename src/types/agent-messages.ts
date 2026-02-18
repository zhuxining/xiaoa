/**
 * Custom AgentMessage types for xiaoa.
 * Uses declaration merging to extend pi-agent-core's AgentMessage union.
 */
import type { PermissionRisk, PermissionType } from "@/ipc/chat/schemas";

export interface PermissionRequestMessage {
  role: "permission_request";
  permissionId: string;
  permissionType: PermissionType;
  permissionRisk: PermissionRisk;
  permissionTitle: string;
  permissionDescription: string;
  permissionDetails: string;
  timestamp: number;
}

export interface CompactionSummaryMessage {
  role: "compaction_summary";
  summary: string;
  flushedMessageCount: number;
  timestamp: number;
}

export interface MemoryUpdateMessage {
  role: "memory_update";
  content: string;
  timestamp: number;
}

declare module "@mariozechner/pi-agent-core" {
  interface CustomAgentMessages {
    permission_request: PermissionRequestMessage;
    compaction_summary: CompactionSummaryMessage;
    memory_update: MemoryUpdateMessage;
  }
}

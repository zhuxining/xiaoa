/**
 * session-pool.ts - AgentSession 长生命周期缓存
 *
 * 以 sessionKey（scope:workspaceId:sessionId）为键缓存 AgentSession 实例，
 * 避免每条消息都创建/销毁 session，实现跨消息的 session 复用。
 */

import type { CreateAgentSessionResult } from "@mariozechner/pi-coding-agent";

interface PoolEntry {
  /** 标记是否正在被 run 使用 */
  busy: boolean;
  result: CreateAgentSessionResult;
}

const pool = new Map<string, PoolEntry>();

/**
 * 获取已缓存的 session，如不存在则通过 createFn 创建并缓存。
 *
 * @returns { result, isResumed } — isResumed 为 true 表示从 pool 复用
 */
export async function getOrCreateSession(
  key: string,
  createFn: () => Promise<CreateAgentSessionResult>
): Promise<{ result: CreateAgentSessionResult; isResumed: boolean }> {
  const existing = pool.get(key);
  if (existing) {
    existing.busy = true;
    return { result: existing.result, isResumed: true };
  }

  const result = await createFn();
  pool.set(key, { result, busy: true });
  return { result, isResumed: false };
}

/**
 * 标记 session 为闲置（run 结束后调用）
 */
export function releaseSession(key: string): void {
  const entry = pool.get(key);
  if (entry) {
    entry.busy = false;
  }
}

/**
 * 销毁并移除 session（删除会话时调用）
 */
export function disposeSession(key: string): void {
  const entry = pool.get(key);
  if (entry) {
    entry.result.session.dispose();
    pool.delete(key);
  }
}

/**
 * 销毁所有 session（应用退出时调用）
 */
export function disposeAll(): void {
  for (const [key, entry] of pool) {
    entry.result.session.dispose();
    pool.delete(key);
  }
}

/**
 * 检查 session 是否在 pool 中
 */
export function hasSession(key: string): boolean {
  return pool.has(key);
}

/**
 * 获取 pool 中的 session（不创建）
 */
export function getPooledSession(
  key: string
): CreateAgentSessionResult | undefined {
  return pool.get(key)?.result;
}

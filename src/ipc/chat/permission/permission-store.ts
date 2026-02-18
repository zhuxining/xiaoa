import type { PermissionType } from "../schemas";

const sessionPermissionAllowlist = new Map<string, Set<PermissionType>>();

export function addSessionPermissionAllow(
  key: string,
  permissionType: PermissionType
): void {
  const allowlist =
    sessionPermissionAllowlist.get(key) ?? new Set<PermissionType>();
  allowlist.add(permissionType);
  sessionPermissionAllowlist.set(key, allowlist);
}

export function isPermissionAllowedInSession(
  key: string,
  permissionType: PermissionType
): boolean {
  return sessionPermissionAllowlist.get(key)?.has(permissionType) ?? false;
}

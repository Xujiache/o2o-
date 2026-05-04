/**
 * 平台 Web Token 存储:键空间 `o2o:admin:` namespace。
 * 平台 Web 只用 Admin-Token,跨端调用必须返回 FORBIDDEN。
 */
const NS = 'o2o:admin';
const KEY_TOKEN = `${NS}:token`;
const KEY_PRINCIPAL = `${NS}:principal`;
const KEY_PERMISSIONS = `${NS}:permissions`;

export interface PrincipalSummary {
  principalId: string;
  scope: 'admin';
  roles: string[];
}

export function getToken(): string | null {
  return localStorage.getItem(KEY_TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(KEY_TOKEN, token);
}

export function clearAuth(): void {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_PRINCIPAL);
  localStorage.removeItem(KEY_PERMISSIONS);
}

export function getPrincipal(): PrincipalSummary | null {
  const v = localStorage.getItem(KEY_PRINCIPAL);
  return v ? (JSON.parse(v) as PrincipalSummary) : null;
}

export function setPrincipal(p: PrincipalSummary): void {
  localStorage.setItem(KEY_PRINCIPAL, JSON.stringify(p));
}

export function getPermissions(): string[] {
  const v = localStorage.getItem(KEY_PERMISSIONS);
  return v ? (JSON.parse(v) as string[]) : [];
}

export function setPermissions(perms: string[]): void {
  localStorage.setItem(KEY_PERMISSIONS, JSON.stringify(perms));
}

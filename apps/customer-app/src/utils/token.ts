/**
 * Customer 端 Token 存储:键空间使用端 namespace 防止与其他端冲突
 */
const NS = 'o2o:customer';
const KEY_TOKEN = `${NS}:token`;
const KEY_PRINCIPAL = `${NS}:principal`;

export interface PrincipalSummary {
  principalId: string;
  scope: 'customer';
  roles: string[];
  expireAt?: number;
}

export function getToken(): string | null {
  try {
    return uni.getStorageSync(KEY_TOKEN) || null;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  uni.setStorageSync(KEY_TOKEN, token);
}

export function clearToken(): void {
  uni.removeStorageSync(KEY_TOKEN);
  uni.removeStorageSync(KEY_PRINCIPAL);
}

export function getPrincipal(): PrincipalSummary | null {
  try {
    const v = uni.getStorageSync(KEY_PRINCIPAL);
    return v ? (JSON.parse(v) as PrincipalSummary) : null;
  } catch {
    return null;
  }
}

export function setPrincipal(p: PrincipalSummary): void {
  uni.setStorageSync(KEY_PRINCIPAL, JSON.stringify(p));
}

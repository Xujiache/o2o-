/**
 * Merchant 端 Token 存储:键空间使用 `o2o:merchant:` namespace 防止与其他端冲突。
 * 商家端只用 Merchant-Token,跨端调用必须返回 FORBIDDEN。
 */
const NS = 'o2o:merchant';
const KEY_TOKEN = `${NS}:token`;
const KEY_PRINCIPAL = `${NS}:principal`;

export interface PrincipalSummary {
  principalId: string;
  scope: 'merchant';
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

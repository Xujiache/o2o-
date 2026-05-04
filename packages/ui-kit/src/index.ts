/** 金额格式化:分 → 元,保留 2 位 */
export function formatAmount(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '-';
  return (cents / 100).toFixed(2);
}

/** 距离格式化:米 → 友好展示 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/** 毫秒时间戳 → YYYY-MM-DD HH:mm:ss */
export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

/** 手机号脱敏 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone ?? '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/** 身份证脱敏 */
export function maskIdCard(id: string | null | undefined): string {
  if (!id || id.length < 8) return id ?? '';
  return `${id.slice(0, 4)}**********${id.slice(-4)}`;
}

/** 分 → 元字符串(保留 2 位小数) */
export function formatYuan(cents: string | number | bigint): string {
  const n = typeof cents === 'bigint' ? Number(cents) : Number(cents);
  if (!Number.isFinite(n)) return '0.00';
  return (n / 100).toFixed(2);
}

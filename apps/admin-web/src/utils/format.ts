export function formatYuan(cents: string | number | null | undefined): string {
  if (cents === null || cents === undefined || cents === '') return '--';
  const value = Number(cents);
  if (!Number.isFinite(value)) return '--';
  return `${(value / 100).toFixed(2)} 元`;
}

export function formatDateTime(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '--';
  const value = Number(ts);
  if (!Number.isFinite(value) || value <= 0) return '--';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

export function formatDate(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return '--';
  const value = Number(ts);
  if (!Number.isFinite(value) || value <= 0) return '--';
  return new Date(value).toLocaleDateString('zh-CN');
}

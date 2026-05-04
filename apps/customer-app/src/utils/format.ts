/**
 * 通用格式化工具:金额(分→元)、距离(米→km)、手机号脱敏。
 * 后端金额返回分,前端只做展示;距离单位米。
 */

export function formatAmountFen(fen: number | string | null | undefined): string {
  if (fen === null || fen === undefined || fen === '') return '0.00';
  const n = typeof fen === 'string' ? Number(fen) : fen;
  if (Number.isNaN(n)) return '0.00';
  return (n / 100).toFixed(2);
}

export function formatDistanceMeters(meter: number | null | undefined): string {
  if (meter === null || meter === undefined || Number.isNaN(meter)) return '-';
  if (meter < 1000) return `${Math.round(meter)}m`;
  return `${(meter / 1000).toFixed(1)}km`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

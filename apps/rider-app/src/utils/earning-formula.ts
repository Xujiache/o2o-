/** 收益展示工具 */

export function fmtCents(cents: string | number): string {
  return (Number(cents) / 100).toFixed(2);
}

export function fmtPercent(rate: string | number): string {
  return (Number(rate) * 100).toFixed(2) + '%';
}

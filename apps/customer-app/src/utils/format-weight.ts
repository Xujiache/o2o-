/**
 * 把克数格式化展示给用户.
 *  < 1000g  → "500g"
 *  ≥ 1000g  → "1.2kg" (整数则不带小数:"2kg")
 *  null/undefined/0 → 空串(调用方按需判断是否渲染)
 */
export function formatWeight(grams: number | null | undefined): string {
  if (grams == null || grams <= 0) return '';
  if (grams < 1000) return `${grams} g`;
  const kg = grams / 1000;
  if (Number.isInteger(kg)) return `${kg} kg`;
  return `${kg.toFixed(1)} kg`;
}

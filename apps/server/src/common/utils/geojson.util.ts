/**
 * GeoJSON Polygon 校验(stage 3 admin-rider 内嵌版本提取共享,stage 4 admin-city 复用)。
 *
 * 规则:
 *  - type='Polygon'(必须)
 *  - coordinates 必须 array
 *  - 允许空 coordinates([])占位(未配置 = 全城)
 *  - 每环 ≥4 点 + 首尾闭合
 */
export function isValidGeoJsonPolygon(g: unknown): boolean {
  if (!g || typeof g !== 'object') return false;
  const obj = g as { type?: string; coordinates?: unknown };
  if (obj.type !== 'Polygon') return false;
  if (!Array.isArray(obj.coordinates)) return false;
  if (obj.coordinates.length === 0) return true;
  for (const ring of obj.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!Array.isArray(first) || !Array.isArray(last)) return false;
    if (first[0] !== last[0] || first[1] !== last[1]) return false;
  }
  return true;
}

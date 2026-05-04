import { nanoid } from 'nanoid';

/** traceId:`时间戳-10 位 nanoid`,便于排序 + 唯一 */
export function generateTraceId(): string {
  return `${Date.now()}-${nanoid(10)}`;
}

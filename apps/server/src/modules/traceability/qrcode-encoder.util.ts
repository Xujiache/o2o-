/**
 * GR-5 — 二维码 code 编码 + checksum 工具
 *
 * 格式:O2OG-{batch:4}-{item:6}-{checksum:2}
 *  - batch: base36 编码批次序号(0~46655,共 4 位)
 *  - item : base36 编码批次内序号(0~46655,但单批限制 ≤1000)
 *  - checksum: 前缀的 SHA-256 取前 2 字符(大写)— 轻验签,防伪
 *
 * 例:O2OG-A1B2-C3D4E5-F6
 */
import { createHash } from 'node:crypto';

const CODE_RE = /^O2OG-([0-9A-Z]{4})-([0-9A-Z]{6})-([0-9A-Z]{2})$/;
const MAX_BATCH = 46656; // 36^4
const MAX_ITEM = 46656; // 36^6 但实际单批 ≤1000

export function encodeQrcode(batchSeq: number, itemSeq: number): string {
  if (!Number.isInteger(batchSeq) || batchSeq < 0 || batchSeq >= MAX_BATCH) {
    throw new Error(`batchSeq out of range: ${batchSeq}`);
  }
  if (!Number.isInteger(itemSeq) || itemSeq < 0 || itemSeq >= MAX_ITEM) {
    throw new Error(`itemSeq out of range: ${itemSeq}`);
  }
  const batchStr = batchSeq.toString(36).toUpperCase().padStart(4, '0');
  const itemStr = itemSeq.toString(36).toUpperCase().padStart(6, '0');
  const prefix = `O2OG-${batchStr}-${itemStr}`;
  const checksum = checksumOf(prefix);
  return `${prefix}-${checksum}`;
}

export function verifyQrcode(code: string): boolean {
  const m = code.match(CODE_RE);
  if (!m) return false;
  const [, batch, item, sum] = m;
  const expected = checksumOf(`O2OG-${batch}-${item}`);
  return sum === expected;
}

export function parseQrcode(code: string): { batchSeq: number; itemSeq: number } | null {
  if (!verifyQrcode(code)) return null;
  const m = code.match(CODE_RE)!;
  return {
    batchSeq: parseInt(m[1]!, 36),
    itemSeq: parseInt(m[2]!, 36),
  };
}

function checksumOf(prefix: string): string {
  return createHash('sha256').update(prefix).digest('hex').toUpperCase().slice(0, 2);
}

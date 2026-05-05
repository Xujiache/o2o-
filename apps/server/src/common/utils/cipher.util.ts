import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALG = 'aes-256-cbc';
const IV_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.THIRD_PARTY_SECRET_KEY ?? 'o2o-dev-third-party-secret-key';
  return createHash('sha256').update(raw).digest(); // 32 bytes
}

/** 加密明文 → `aes256$<ivHex>$<cipherHex>` */
export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `aes256$${iv.toString('hex')}$${enc.toString('hex')}`;
}

/** 解密 `aes256$<ivHex>$<cipherHex>` → 明文;格式不对返 null */
export function decryptSecret(stored: string): string | null {
  if (!stored) return null;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'aes256') return null;
  try {
    const iv = Buffer.from(parts[1] ?? '', 'hex');
    const enc = Buffer.from(parts[2] ?? '', 'hex');
    if (iv.length !== IV_LEN) return null;
    const decipher = createDecipheriv(ALG, getKey(), iv);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

/** 显示用脱敏:前 3 + *** + 后 3,长度不够全 *** */
export function maskSecret(plain: string | null | undefined): string {
  if (!plain) return '';
  if (plain.length <= 6) return '***';
  return `${plain.slice(0, 3)}***${plain.slice(-3)}`;
}

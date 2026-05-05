import { decryptSecret, encryptSecret, maskSecret } from './cipher.util';

describe('cipher.util', () => {
  it('encryptSecret 返 aes256$<iv>$<cipher> 格式', () => {
    const enc = encryptSecret('my-secret-value');
    const parts = enc.split('$');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('aes256');
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16 字节 iv = 32 hex
  });

  it('decryptSecret 还原明文', () => {
    const enc = encryptSecret('hello-world-1234');
    expect(decryptSecret(enc)).toBe('hello-world-1234');
  });

  it('encryptSecret 同明文不同 iv → 密文不同,但解密一致', () => {
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same');
    expect(decryptSecret(b)).toBe('same');
  });

  it('decryptSecret 格式错 → null', () => {
    expect(decryptSecret('')).toBeNull();
    expect(decryptSecret('plain-text')).toBeNull();
    expect(decryptSecret('aes256$nothex$yyy')).toBeNull();
  });

  it('maskSecret 前 3 + *** + 后 3', () => {
    expect(maskSecret('1234567890')).toBe('123***890');
    expect(maskSecret('abc')).toBe('***'); // 长度 ≤6 全脱
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
  });

  it('encryptSecret 空字符串 → 空字符串', () => {
    expect(encryptSecret('')).toBe('');
  });
});

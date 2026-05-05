import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('hashPassword 返 scrypt$<saltHex>$<hashHex> 格式', () => {
    const hash = hashPassword('test-pwd-123');
    const parts = hash.split('$');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16 bytes salt = 32 hex
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/); // 32 bytes key = 64 hex
  });

  it('verifyPassword 对正确明文返 true', () => {
    const hash = hashPassword('O2o@2026-Admin');
    expect(verifyPassword('O2o@2026-Admin', hash)).toBe(true);
  });

  it('verifyPassword 对错误明文返 false', () => {
    const hash = hashPassword('correct');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('verifyPassword 对格式错乱的 stored 返 false 不抛', () => {
    expect(verifyPassword('any', '')).toBe(false);
    expect(verifyPassword('any', 'invalid$format')).toBe(false);
    expect(verifyPassword('any', 'md5$xxx$yyy')).toBe(false);
    expect(verifyPassword('any', 'scrypt$nothex$yyy')).toBe(false);
  });

  it('hashPassword 同一明文不同 salt → 不同密文', () => {
    const a = hashPassword('same-pwd');
    const b = hashPassword('same-pwd');
    expect(a).not.toBe(b);
    expect(verifyPassword('same-pwd', a)).toBe(true);
    expect(verifyPassword('same-pwd', b)).toBe(true);
  });
});

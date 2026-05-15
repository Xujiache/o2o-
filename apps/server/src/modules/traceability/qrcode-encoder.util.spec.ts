import { encodeQrcode, parseQrcode, verifyQrcode } from './qrcode-encoder.util';

describe('qrcode-encoder', () => {
  it('encodeQrcode 格式正确', () => {
    const c = encodeQrcode(0, 0);
    expect(c).toMatch(/^O2OG-0000-000000-[0-9A-F]{2}$/);
  });

  it('encodeQrcode 不同 seq 生成不同 code', () => {
    const a = encodeQrcode(1, 1);
    const b = encodeQrcode(1, 2);
    const c = encodeQrcode(2, 1);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('verifyQrcode 自生成的全部 valid', () => {
    for (let i = 0; i < 10; i++) {
      const code = encodeQrcode(i, i * 7);
      expect(verifyQrcode(code)).toBe(true);
    }
  });

  it('verifyQrcode 篡改 checksum 失败', () => {
    const code = encodeQrcode(5, 50);
    const tampered = code.slice(0, -2) + 'XX';
    expect(verifyQrcode(tampered)).toBe(false);
  });

  it('verifyQrcode 格式错误失败', () => {
    expect(verifyQrcode('NOT-A-CODE')).toBe(false);
    expect(verifyQrcode('O2OG-XX-YYYYYY-ZZ')).toBe(false);
  });

  it('parseQrcode 还原 batch/item', () => {
    const code = encodeQrcode(123, 456);
    const r = parseQrcode(code);
    expect(r).toEqual({ batchSeq: 123, itemSeq: 456 });
  });

  it('encodeQrcode 超出范围抛错', () => {
    expect(() => encodeQrcode(-1, 0)).toThrow();
    expect(() => encodeQrcode(0, 46656)).toThrow();
    expect(() => encodeQrcode(46656, 0)).toThrow();
  });
});

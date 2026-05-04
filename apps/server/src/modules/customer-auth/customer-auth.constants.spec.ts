import { parseTtlToSeconds } from './customer-auth.constants';

describe('parseTtlToSeconds', () => {
  it('解析秒', () => {
    expect(parseTtlToSeconds('30s')).toBe(30);
  });
  it('解析分钟', () => {
    expect(parseTtlToSeconds('5m')).toBe(300);
  });
  it('解析小时', () => {
    expect(parseTtlToSeconds('2h')).toBe(7200);
  });
  it('解析天', () => {
    expect(parseTtlToSeconds('30d')).toBe(2592000);
  });
  it('非法格式返回 0', () => {
    expect(parseTtlToSeconds('forever')).toBe(0);
    expect(parseTtlToSeconds('')).toBe(0);
    expect(parseTtlToSeconds('5x')).toBe(0);
  });
});

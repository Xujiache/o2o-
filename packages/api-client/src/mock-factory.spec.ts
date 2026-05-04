import { describe, expect, it } from 'vitest';

import { createMockApiClient } from './mock-factory';

describe('createMockApiClient', () => {
  it('默认返回 fixture 数据并记录 calls', async () => {
    const m = createMockApiClient();
    const dict = await m.request({ url: '/api/v1/pub/dictionaries' });
    expect(dict.code).toBe('0');
    expect(Array.isArray(dict.data)).toBe(true);
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0]?.url).toBe('/api/v1/pub/dictionaries');
  });

  it('setFixture 覆盖默认值', async () => {
    const m = createMockApiClient();
    m.setFixture('/api/v1/pub/cities', [{ cityCode: '999999', cityName: 'Test City' }]);
    const res = await m.request({ url: '/api/v1/pub/cities' });
    expect(res.data).toEqual([{ cityCode: '999999', cityName: 'Test City' }]);
  });

  it('reset 清历史与 fixture', async () => {
    const m = createMockApiClient();
    m.setFixture('/api/v1/pub/cities', [{ cityCode: 'X' }]);
    await m.request({ url: '/api/v1/pub/cities' });
    m.reset();
    expect(m.calls).toHaveLength(0);
    const res = await m.request({ url: '/api/v1/pub/cities' });
    // reset 后回到默认 fixture
    expect(res.data).toEqual([{ cityCode: '110100', cityName: '北京市', province: '北京', serviceEnabled: true }]);
  });
});

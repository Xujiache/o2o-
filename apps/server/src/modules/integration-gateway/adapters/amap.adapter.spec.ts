import { AmapMockAdapter, AmapRealAdapter, haversineDistance } from './amap.adapter';

describe('haversineDistance', () => {
  it('返 0 当起点终点相同', () => {
    const p = { lat: 39.9042, lng: 116.4074 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('北京 → 上海 ~ 1067 km(±5%)', () => {
    const beijing = { lat: 39.9042, lng: 116.4074 };
    const shanghai = { lat: 31.2304, lng: 121.4737 };
    const d = haversineDistance(beijing, shanghai);
    expect(d).toBeGreaterThan(1_000_000);
    expect(d).toBeLessThan(1_200_000);
  });

  it('对称性:A→B 与 B→A 相等', () => {
    const a = { lat: 39.9042, lng: 116.4074 };
    const b = { lat: 31.2304, lng: 121.4737 };
    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
  });

  it('短距离 ~ 1 km 同纬度精度', () => {
    const a = { lat: 39.9042, lng: 116.4074 };
    const b = { lat: 39.9042, lng: 116.4192 }; // 经度 ~0.0118° ≈ 1 km @ 39.9°
    const d = haversineDistance(a, b);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});

describe('AmapMockAdapter', () => {
  const adapter = new AmapMockAdapter();

  it('geocode 返北京中心点', async () => {
    expect(await adapter.geocode('随便填')).toEqual({ lat: 39.9042, lng: 116.4074 });
  });

  it('reverseGeocode 返 mock 字符串', async () => {
    expect(await adapter.reverseGeocode({ lat: 0, lng: 0 })).toContain('mock');
  });

  it('distance 走 Haversine,同点返 0', async () => {
    const p = { lat: 39.9042, lng: 116.4074 };
    expect(await adapter.distance(p, p)).toBe(0);
  });

  it('route 返起点+终点+eta(7m/s 估算)', async () => {
    const a = { lat: 39.9042, lng: 116.4074 };
    const b = { lat: 39.9042, lng: 116.4192 };
    const r = await adapter.route(a, b);
    expect(r.points).toHaveLength(2);
    expect(r.points[0]?.distanceFromStart).toBe(0);
    expect(r.points[1]?.distanceFromStart).toBe(r.totalDistanceMeters);
    expect(r.etaMs).toBeGreaterThan(0);
    // 1km / 7m/s ≈ 142s ≈ 142000ms
    expect(r.etaMs).toBeGreaterThan(120_000);
    expect(r.etaMs).toBeLessThan(160_000);
  });
});

describe('AmapRealAdapter', () => {
  it('无 key 抛 MISCONFIGURED', () => {
    expect(() => new AmapRealAdapter('')).toThrow(/MISCONFIGURED: AMAP_WEB_SERVICE_KEY/);
  });

  it('有 key 可以构造(实际 HTTP 调用不在单测范围)', () => {
    expect(() => new AmapRealAdapter('test-key')).not.toThrow();
  });
});

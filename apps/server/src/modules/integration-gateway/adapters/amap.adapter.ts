export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePoint extends LatLng {
  /** 里程,单位米;0 表示起点 */
  distanceFromStart: number;
}

export interface RouteResult {
  /** 总里程,米 */
  totalDistanceMeters: number;
  /** 预计时间,毫秒 */
  etaMs: number;
  /** 路径点(本阶段简化:起点 + 终点) */
  points: RoutePoint[];
}

export interface AmapAdapter {
  geocode(address: string): Promise<LatLng>;
  reverseGeocode(p: LatLng): Promise<string>;
  distance(from: LatLng, to: LatLng): Promise<number>;
  route(from: LatLng, to: LatLng): Promise<RouteResult>;
}

const EARTH_RADIUS_METERS = 6371_000;
const RIDER_AVG_SPEED_M_PER_S = 7; // 25 km/h ≈ 7 m/s

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine 公式;返米。同点返 0。 */
export function haversineDistance(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export class AmapMockAdapter implements AmapAdapter {
  async geocode(_address: string): Promise<LatLng> {
    return { lat: 39.9042, lng: 116.4074 };
  }
  async reverseGeocode(_p: LatLng): Promise<string> {
    return '北京市朝阳区(mock)';
  }
  async distance(from: LatLng, to: LatLng): Promise<number> {
    return haversineDistance(from, to);
  }
  async route(from: LatLng, to: LatLng): Promise<RouteResult> {
    const total = haversineDistance(from, to);
    const eta = Math.ceil(total / RIDER_AVG_SPEED_M_PER_S) * 1000;
    return {
      totalDistanceMeters: total,
      etaMs: eta,
      points: [
        { ...from, distanceFromStart: 0 },
        { ...to, distanceFromStart: total },
      ],
    };
  }
}

export class AmapRealAdapter implements AmapAdapter {
  constructor(private readonly key: string) {
    if (!key) throw new Error('AMAP_KEY required (set INTEGRATION_MODE=mock or provide credentials)');
  }
  geocode(): Promise<LatLng> {
    throw new Error('amap real adapter not implemented yet — pending business stage');
  }
  reverseGeocode(): Promise<string> {
    throw new Error('amap real adapter not implemented yet');
  }
  distance(): Promise<number> {
    throw new Error('amap real adapter not implemented yet');
  }
  route(): Promise<RouteResult> {
    throw new Error('amap real adapter not implemented yet');
  }
}

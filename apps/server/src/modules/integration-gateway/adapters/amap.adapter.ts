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

/**
 * 高德 Web API Real Adapter — "credentials present → live" skeleton.
 *  - geocode :        GET https://restapi.amap.com/v3/geocode/geo
 *  - reverseGeocode : GET https://restapi.amap.com/v3/geocode/regeo
 *  - distance :       GET https://restapi.amap.com/v3/distance
 *  - route :          GET https://restapi.amap.com/v3/direction/driving
 */
export class AmapRealAdapter implements AmapAdapter {
  private static readonly BASE = 'https://restapi.amap.com/v3';

  constructor(private readonly key: string) {
    if (!key) throw new Error('MISCONFIGURED: AMAP_WEB_SERVICE_KEY required');
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const usp = new URLSearchParams({ ...params, key: this.key, output: 'JSON' });
    const url = `${AmapRealAdapter.BASE}${path}?${usp.toString()}`;
    const res = await fetch(url, { method: 'GET' });
    const txt = await res.text();
    if (!res.ok) throw new Error(`amap GET ${path} http ${res.status}: ${txt}`);
    return JSON.parse(txt) as T;
  }

  async geocode(address: string): Promise<LatLng> {
    const json = await this.get<{ status?: string; geocodes?: Array<{ location?: string }>; info?: string }>(
      '/geocode/geo',
      { address },
    );
    if (json.status !== '1') throw new Error(`amap geocode failed: ${json.info ?? 'unknown'}`);
    const loc = json.geocodes?.[0]?.location;
    if (!loc) throw new Error('amap geocode no result');
    const parts = loc.split(',');
    const lng = Number(parts[0] ?? 0);
    const lat = Number(parts[1] ?? 0);
    return { lat, lng };
  }

  async reverseGeocode(p: LatLng): Promise<string> {
    const json = await this.get<{ status?: string; regeocode?: { formatted_address?: string }; info?: string }>(
      '/geocode/regeo',
      { location: `${p.lng},${p.lat}` },
    );
    if (json.status !== '1') throw new Error(`amap regeo failed: ${json.info ?? 'unknown'}`);
    return json.regeocode?.formatted_address ?? '';
  }

  async distance(from: LatLng, to: LatLng): Promise<number> {
    const json = await this.get<{ status?: string; results?: Array<{ distance?: string }>; info?: string }>(
      '/distance',
      {
        origins: `${from.lng},${from.lat}`,
        destination: `${to.lng},${to.lat}`,
        type: '1', // 驾车
      },
    );
    if (json.status !== '1') throw new Error(`amap distance failed: ${json.info ?? 'unknown'}`);
    const d = json.results?.[0]?.distance;
    if (!d) throw new Error('amap distance empty result');
    return Number(d);
  }

  async route(from: LatLng, to: LatLng): Promise<RouteResult> {
    const json = await this.get<{
      status?: string;
      route?: { paths?: Array<{ distance?: string; duration?: string }> };
      info?: string;
    }>('/direction/driving', {
      origin: `${from.lng},${from.lat}`,
      destination: `${to.lng},${to.lat}`,
    });
    if (json.status !== '1') throw new Error(`amap route failed: ${json.info ?? 'unknown'}`);
    const path = json.route?.paths?.[0];
    if (!path) throw new Error('amap route no path');
    const total = Number(path.distance ?? 0);
    const etaMs = Number(path.duration ?? 0) * 1000;
    return {
      totalDistanceMeters: total,
      etaMs,
      points: [
        { ...from, distanceFromStart: 0 },
        { ...to, distanceFromStart: total },
      ],
    };
  }
}

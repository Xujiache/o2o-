export interface LatLng {
  lat: number;
  lng: number;
}

export interface AmapAdapter {
  geocode(address: string): Promise<LatLng>;
  reverseGeocode(p: LatLng): Promise<string>;
  distance(from: LatLng, to: LatLng): Promise<number>;
}

export class AmapMockAdapter implements AmapAdapter {
  async geocode(_address: string): Promise<LatLng> {
    return { lat: 39.9042, lng: 116.4074 };
  }
  async reverseGeocode(_p: LatLng): Promise<string> {
    return '北京市朝阳区(mock)';
  }
  async distance(_from: LatLng, _to: LatLng): Promise<number> {
    return 1500;
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
}

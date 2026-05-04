/**
 * 定位 service:封装 uni.getLocation + 后台定位权限申请。
 * 阶段 0 仅骨架,实际接入(精度策略 / 定位失败重试 / 高频定位节流) 留给 Stage 3 / 8。
 *
 * Android 后台定位前置条件:
 *   - manifest.json android.permissions 已声明 ACCESS_FINE_LOCATION /
 *     ACCESS_BACKGROUND_LOCATION / FOREGROUND_SERVICE / FOREGROUND_SERVICE_LOCATION
 *   - 运行时需依次申请前台 → 后台权限(Android 10+ 强制)
 * iOS 后台定位前置条件:
 *   - Info.plist NSLocationAlwaysAndWhenInUseUsageDescription / UIBackgroundModes 含 "location"
 *   - 用户必须先授予「使用 APP 期间」再升级为「始终允许」
 */

export interface LocationPoint {
  latitude: number;
  longitude: number;
  /** 精度米;mock 为 50 */
  accuracyMeter: number;
  /** 速度 m/s;停止/未知为 0 */
  speed: number;
  /** 上报时间(ms 时间戳) */
  capturedAt: number;
}

export interface LocationService {
  /** 请求前台定位权限;返回是否授予 */
  requestForegroundPermission(): Promise<boolean>;
  /** 请求后台定位权限(Android 10+ / iOS Always);需先获前台权限 */
  requestBackgroundPermission(): Promise<boolean>;
  /** 单次定位 */
  getOnce(): Promise<LocationPoint>;
  /** 启动持续定位(返回订阅 id;实际节流策略 Stage 3 接入) */
  startWatch(handler: (p: LocationPoint) => void): Promise<string>;
  /** 停止持续定位 */
  stopWatch(watchId: string): Promise<void>;
}

class MockLocationService implements LocationService {
  private mockPoint: LocationPoint = {
    latitude: 39.9042,
    longitude: 116.4074,
    accuracyMeter: 50,
    speed: 0,
    capturedAt: Date.now(),
  };

  async requestForegroundPermission(): Promise<boolean> {
    // TODO: Stage 3/8 接入 — 平台运行时权限申请(uni.authorize / plus.android.requestPermissions)
    return true;
  }

  async requestBackgroundPermission(): Promise<boolean> {
    // TODO: Stage 3/8 接入 — Android 10+ ACCESS_BACKGROUND_LOCATION 二阶段授权
    // TODO: Stage 3/8 接入 — iOS requestAlwaysAuthorization 升级
    return true;
  }

  async getOnce(): Promise<LocationPoint> {
    // TODO: Stage 3/8 接入 — uni.getLocation({ type:'gcj02', altitude:false, isHighAccuracy:true })
    return { ...this.mockPoint, capturedAt: Date.now() };
  }

  async startWatch(_handler: (p: LocationPoint) => void): Promise<string> {
    // TODO: Stage 3/8 接入 — uni.startLocationUpdate / uni.startLocationUpdateBackground + onLocationChange
    return `mock-watch-${Date.now()}`;
  }

  async stopWatch(_watchId: string): Promise<void> {
    // TODO: Stage 3/8 接入 — uni.stopLocationUpdate + offLocationChange
  }
}

export const locationService: LocationService = new MockLocationService();

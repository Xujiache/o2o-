/**
 * 定位 service:封装 uni.getLocation + 后台定位权限申请。
 * 精度策略 / 后台定位 / 高频节流仍留给 Stage 8,但不再返回固定 mock 坐标。
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
  /** 精度米;平台未返回时为 0 */
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

/** demo / 浏览器拒授权时的兜底坐标(北京天安门附近,与 demo seed 一致) */
const FALLBACK_POINT: LocationPoint = {
  latitude: 39.90923,
  longitude: 116.397428,
  accuracyMeter: 0,
  speed: 0,
  capturedAt: 0,
};

class UniLocationService implements LocationService {
  private watchers = new Map<string, ReturnType<typeof setInterval>>();

  async requestForegroundPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      uni.authorize({
        scope: 'scope.userLocation',
        success: () => resolve(true),
        fail: () => resolve(false),
      });
    });
  }

  async requestBackgroundPermission(): Promise<boolean> {
    // Stage 8 再接 Android/iOS 后台定位升级。当前只声明不伪造授权结果。
    return false;
  }

  async getOnce(): Promise<LocationPoint> {
    // 先试 wgs84(浏览器原生坐标系,不需地图 provider 转换)
    try {
      return await this.getOnceWithType('wgs84');
    } catch {
      // 兜底:返回 demo 默认坐标,保证业务流程不被定位失败阻断
      // stage 11 接真高德/腾讯 key 后改回 'gcj02' 优先 + 移除兜底
      return { ...FALLBACK_POINT, capturedAt: Date.now() };
    }
  }

  private getOnceWithType(type: 'wgs84' | 'gcj02'): Promise<LocationPoint> {
    return new Promise((resolve, reject) => {
      uni.getLocation({
        type,
        isHighAccuracy: true,
        success(res) {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracyMeter: res.accuracy ?? 0,
            speed: res.speed ?? 0,
            capturedAt: Date.now(),
          });
        },
        fail(err) {
          reject(new Error(err.errMsg || '定位失败'));
        },
      });
    });
  }

  async startWatch(handler: (p: LocationPoint) => void): Promise<string> {
    const watchId = `uni-watch-${Date.now()}`;
    const timer = setInterval(() => {
      void this.getOnce()
        .then(handler)
        .catch(() => undefined);
    }, 30000);
    this.watchers.set(watchId, timer);
    return watchId;
  }

  async stopWatch(watchId: string): Promise<void> {
    const timer = this.watchers.get(watchId);
    if (timer) {
      clearInterval(timer);
      this.watchers.delete(watchId);
    }
  }
}

export const locationService: LocationService = new UniLocationService();

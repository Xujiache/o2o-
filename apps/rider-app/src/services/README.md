# 骑手端预留能力 service 说明

> 阶段 0 仅骨架(`MockXxxService`)。实际接入留给 Stage 3 / 8。
> 任何对真实 SDK 的引用都必须通过这 4 个 service 出口,业务层不直接 import 个推 / GTSDK / plus.android。

## 文件清单

| 文件              | 职责                            | 真实接入阶段 |
| ----------------- | ------------------------------- | ------------ |
| `location.ts`     | 前台/后台定位                   | Stage 3      |
| `trace-upload.ts` | 轨迹批量上传                    | Stage 3 / 8  |
| `push.ts`         | 个推 SDK + cid 绑定             | Stage 3      |
| `keepalive.ts`    | Android 前台服务 / iOS 后台模式 | Stage 3 / 8  |

## Android 前台服务接入要点

1. `AndroidManifest.xml` 已通过 `manifest.json` 声明的权限注入:
   - `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` / `ACCESS_BACKGROUND_LOCATION`
   - `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION`
   - `WAKE_LOCK` / `RECEIVE_BOOT_COMPLETED`
2. Android 12+ 强制要求前台服务在启动时声明 `foregroundServiceType="location"`,否则 `startForegroundService` 抛 `MissingForegroundServiceTypeException`。
3. 持久化通知必须含图标、标题、内容,缺一项 5s 内被系统强杀。
4. 主流厂商自启白名单需引导用户手动加入(华为/小米/OPPO/vivo),拉起页面 deeplink 由 `keepaliveService.openVendorWhitelistGuide()` 提供。

## iOS Background Modes 接入要点

1. `Info.plist` 已通过 `manifest.json` 声明:
   - `UIBackgroundModes`: `location` / `fetch` / `remote-notification`
   - 全部三段定位用途说明字符串 (`NSLocationWhenInUseUsageDescription`、`NSLocationAlwaysAndWhenInUseUsageDescription`、`NSLocationAlwaysUsageDescription`)
2. 必须先获取 `WhenInUse` 授权,再以 `requestAlwaysAuthorization` 升级,直接申请 `Always` 系统会拒绝。
3. iOS 后台位置仅在「显著位置变化」时唤起 APP;高频上报需结合 `BGAppRefreshTask`(15min+)与 `CLLocationManager.allowsBackgroundLocationUpdates`。

## 与后端接口对齐(Stage 3 实现)

- `POST /api/v1/r/trace/upload` — 批量轨迹上传(数组上限 200 点)
- `POST /api/v1/r/push/bind` — 绑定 cid
- `POST /api/v1/r/push/unbind` — 注销 cid

## 测试钩子

mock service 在 `__DEV__` 环境下可注入异常以验证 UI 兜底:

```ts
// Stage 3 实现时,通过 import.meta.env.DEV 切换 mock/real
```

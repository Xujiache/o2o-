/**
 * 后台保活 service:Android 前台服务 / iOS Background Modes 配置抽象。
 * 阶段 0 仅骨架,实际前台通知样式 / 厂商保活策略(华为/小米/Vivo/Oppo 白名单引导) 留给 Stage 3 / 8。
 *
 * 实现要点(Stage 3/8 落地时遵循):
 *   - Android:启动 ForegroundService + 持久化通知(必须含图标/标题/文案;否则 Android 12+ 拒绝启动)
 *   - iOS:依赖 UIBackgroundModes=location;系统会在显著位置变化时唤起 APP
 *   - 厂商兼容:见 services/README.md(自启白名单引导文案集合)
 */

export interface KeepaliveConfig {
  /** Android 前台服务通知标题 */
  notificationTitle: string;
  /** Android 前台服务通知正文 */
  notificationContent: string;
}

export interface KeepaliveService {
  configure(config: Partial<KeepaliveConfig>): void;
  /** 启动后台保活(Android 前台服务 / iOS 仅记录状态) */
  start(): Promise<void>;
  /** 停止保活 */
  stop(): Promise<void>;
  /** 是否处于保活状态 */
  isActive(): boolean;
  /** 引导用户加入厂商自启白名单(Android);返回 deeplink 是否拉起成功 */
  openVendorWhitelistGuide(): Promise<boolean>;
}

class MockKeepaliveService implements KeepaliveService {
  private active = false;
  private config: KeepaliveConfig = {
    notificationTitle: 'O2O 配送中',
    notificationContent: '正在为顾客配送订单,请保持网络畅通',
  };

  configure(config: Partial<KeepaliveConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async start(): Promise<void> {
    // TODO: Stage 3/8 接入 — Android plus.android.importClass('android.app.Service')+ ForegroundService 启动
    // TODO: Stage 3/8 接入 — iOS 注册 BGAppRefreshTask + 显著位置变化监听
    this.active = true;
  }

  async stop(): Promise<void> {
    // TODO: Stage 3/8 接入 — stopForeground(true) + cancel 持久化通知
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  async openVendorWhitelistGuide(): Promise<boolean> {
    // TODO: Stage 3/8 接入 — 根据 plus.device.vendor 拉起对应厂商电池/自启设置页
    return false;
  }
}

export const keepaliveService: KeepaliveService = new MockKeepaliveService();

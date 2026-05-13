/**
 * 后台保活 service:Android 前台服务 / iOS Background Modes 配置抽象。
 * Android 前台服务 / iOS Background Modes 配置抽象。
 *
 * 实现要点:
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
    // Android ForegroundService 与 iOS 后台位置监听由原生层接入。
    this.active = true;
  }

  async stop(): Promise<void> {
    // 停止前台服务并取消持久化通知。
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  async openVendorWhitelistGuide(): Promise<boolean> {
    // 根据设备厂商拉起对应电池/自启设置页。
    return false;
  }
}

export const keepaliveService: KeepaliveService = new MockKeepaliveService();

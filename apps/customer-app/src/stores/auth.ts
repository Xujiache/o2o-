/**
 * Customer 端认证状态(Pinia + uni storage 持久化)
 *
 * 关注点:
 *   - access/refresh token + isNewUser/profileCompleted
 *   - 登录后跳转、登出清空、refresh 轮换
 *   - 60s 验证码倒计时(刷新页保留)
 *
 * 401 自动 refresh:在 utils/request.ts 中通过 store.refreshIfPossible 调用。
 */
import { defineStore } from 'pinia';

import {
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefresh,
  sendSmsCode as apiSendSms,
  wechatLogin as apiWechatLogin,
  type LoginReq,
  type Platform,
  type SmsScene,
  type WechatLoginReq,
} from '@/api';
import { clearToken, setPrincipal, setToken } from '@/utils/token';

const NS = 'o2o:customer';
const KEY_REFRESH = `${NS}:refresh`;
const KEY_DEVICE = `${NS}:device-id`;
const KEY_AUTH_META = `${NS}:auth-meta`;
const KEY_SMS_COUNTDOWN = `${NS}:sms-countdown`;

interface AuthMeta {
  isNewUser: boolean;
  profileCompleted: boolean;
}

interface SmsCountdownState {
  startedAt: number;
  totalSeconds: number;
  scene: SmsScene;
  mobile: string;
}

interface State {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  isNewUser: boolean;
  profileCompleted: boolean;
  smsCountdown: SmsCountdownState | null;
}

function ensureDeviceId(): string {
  try {
    const cached = uni.getStorageSync(KEY_DEVICE) as string | undefined;
    if (cached) return cached;
    const fresh = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    uni.setStorageSync(KEY_DEVICE, fresh);
    return fresh;
  } catch {
    return `dev-${Date.now()}`;
  }
}

function readPersisted(): Pick<State, 'refreshToken' | 'isNewUser' | 'profileCompleted' | 'smsCountdown'> {
  let refreshToken = '';
  let meta: AuthMeta = { isNewUser: false, profileCompleted: false };
  let countdown: SmsCountdownState | null = null;
  try {
    refreshToken = (uni.getStorageSync(KEY_REFRESH) as string) || '';
    const m = uni.getStorageSync(KEY_AUTH_META);
    if (m) meta = JSON.parse(m) as AuthMeta;
    const c = uni.getStorageSync(KEY_SMS_COUNTDOWN);
    if (c) countdown = JSON.parse(c) as SmsCountdownState;
  } catch {
    // ignore
  }
  return { refreshToken, isNewUser: meta.isNewUser, profileCompleted: meta.profileCompleted, smsCountdown: countdown };
}

export const useAuthStore = defineStore('auth', {
  state: (): State => {
    const persisted = readPersisted();
    return {
      accessToken: '',
      refreshToken: persisted.refreshToken,
      deviceId: ensureDeviceId(),
      isNewUser: persisted.isNewUser,
      profileCompleted: persisted.profileCompleted,
      smsCountdown: persisted.smsCountdown,
    };
  },
  getters: {
    isLoggedIn: (s): boolean => Boolean(s.refreshToken),
    smsRemainingSeconds(): number {
      if (!this.smsCountdown) return 0;
      const elapsed = Math.floor((Date.now() - this.smsCountdown.startedAt) / 1000);
      const remaining = this.smsCountdown.totalSeconds - elapsed;
      return remaining > 0 ? remaining : 0;
    },
  },
  actions: {
    async sendSms(mobile: string, scene: SmsScene): Promise<void> {
      const r = await apiSendSms({ mobile, scene });
      if (r.code !== '0') {
        throw new Error(r.message || '验证码发送失败');
      }
      this.smsCountdown = { startedAt: Date.now(), totalSeconds: 60, scene, mobile };
      uni.setStorageSync(KEY_SMS_COUNTDOWN, JSON.stringify(this.smsCountdown));
    },

    async loginByMobile(mobile: string, code: string, platform: Platform = 'h5'): Promise<void> {
      const body: LoginReq = { mobile, code, deviceId: this.deviceId, platform };
      const r = await apiLogin(body);
      if (r.code !== '0' || !r.data) {
        throw new Error(r.message || '登录失败');
      }
      this.applyTokens(r.data.customerToken, r.data.refreshToken, {
        isNewUser: r.data.isNewUser,
        profileCompleted: r.data.profileCompleted,
      });
    },

    async loginByWechat(jsCode: string, platform: Platform = 'mp-weixin'): Promise<{ bindMobileRequired: boolean }> {
      const body: WechatLoginReq = { jsCode, deviceId: this.deviceId, platform };
      const r = await apiWechatLogin(body);
      if (r.code !== '0' || !r.data) {
        throw new Error(r.message || '微信登录失败');
      }
      this.applyTokens(r.data.customerToken, r.data.refreshToken, {
        isNewUser: r.data.isNewUser,
        profileCompleted: false,
      });
      return { bindMobileRequired: r.data.bindMobileRequired };
    },

    async refreshIfPossible(): Promise<boolean> {
      if (!this.refreshToken) return false;
      try {
        const r = await apiRefresh({ refreshToken: this.refreshToken, deviceId: this.deviceId });
        if (r.code !== '0' || !r.data) return false;
        this.applyTokens(r.data.customerToken, r.data.refreshToken, {
          isNewUser: this.isNewUser,
          profileCompleted: this.profileCompleted,
        });
        return true;
      } catch {
        return false;
      }
    },

    async logout(): Promise<void> {
      try {
        await apiLogout();
      } catch {
        // ignore — 即使后端失败也要清掉本地态
      }
      this.clearAll();
    },

    clearAll(): void {
      this.accessToken = '';
      this.refreshToken = '';
      this.isNewUser = false;
      this.profileCompleted = false;
      this.smsCountdown = null;
      try {
        clearToken();
        uni.removeStorageSync(KEY_REFRESH);
        uni.removeStorageSync(KEY_AUTH_META);
        uni.removeStorageSync(KEY_SMS_COUNTDOWN);
      } catch {
        // ignore
      }
    },

    applyTokens(accessToken: string, refreshToken: string, meta: AuthMeta): void {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.isNewUser = meta.isNewUser;
      this.profileCompleted = meta.profileCompleted;
      try {
        setToken(accessToken);
        uni.setStorageSync(KEY_REFRESH, refreshToken);
        uni.setStorageSync(KEY_AUTH_META, JSON.stringify(meta));
        setPrincipal({ principalId: '', scope: 'customer', roles: ['CUSTOMER'] });
      } catch {
        // ignore
      }
    },

    clearSmsCountdown(): void {
      this.smsCountdown = null;
      try {
        uni.removeStorageSync(KEY_SMS_COUNTDOWN);
      } catch {
        // ignore
      }
    },
  },
});

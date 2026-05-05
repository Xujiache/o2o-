/**
 * Rider 端认证状态(Pinia + uni storage 持久化)
 * 复刻 merchant-app/src/stores/auth.ts 模式,token namespace `o2o:rider`。
 */
import { defineStore } from 'pinia';

import {
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefresh,
  sendSmsCode as apiSendSms,
  type LoginReq,
  type Platform,
} from '@/api';
import { clearToken, setToken } from '@/utils/token';

const NS = 'o2o:rider';
const KEY_REFRESH = `${NS}:refresh`;
const KEY_DEVICE = `${NS}:device-id`;
const KEY_AUTH_META = `${NS}:auth-meta`;
const KEY_SMS_COUNTDOWN = `${NS}:sms-countdown`;

interface AuthMeta {
  riderId: string;
  accountStatus: 'active' | 'disabled';
  hasApplication: boolean;
  latestApplicationId?: string;
}

interface SmsCountdownState {
  startedAt: number;
  totalSeconds: number;
  mobile: string;
}

interface State {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  riderId: string;
  accountStatus: 'active' | 'disabled' | '';
  hasApplication: boolean;
  latestApplicationId: string;
  smsCountdown: SmsCountdownState | null;
}

function ensureDeviceId(): string {
  try {
    const cached = uni.getStorageSync(KEY_DEVICE) as string | undefined;
    if (cached) return cached;
    const fresh = `rider-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    uni.setStorageSync(KEY_DEVICE, fresh);
    return fresh;
  } catch {
    return `rider-${Date.now()}`;
  }
}

function readPersisted(): {
  refreshToken: string;
  meta: AuthMeta | null;
  countdown: SmsCountdownState | null;
} {
  let refreshToken = '';
  let meta: AuthMeta | null = null;
  let countdown: SmsCountdownState | null = null;
  try {
    refreshToken = (uni.getStorageSync(KEY_REFRESH) as string) || '';
    const m = uni.getStorageSync(KEY_AUTH_META);
    if (m) meta = JSON.parse(m) as AuthMeta;
    const c = uni.getStorageSync(KEY_SMS_COUNTDOWN);
    if (c) countdown = JSON.parse(c) as SmsCountdownState;
  } catch {
    /* ignore */
  }
  return { refreshToken, meta, countdown };
}

export const useAuthStore = defineStore('rider-auth', {
  state: (): State => {
    const { refreshToken, meta, countdown } = readPersisted();
    return {
      accessToken: '',
      refreshToken,
      deviceId: ensureDeviceId(),
      riderId: meta?.riderId ?? '',
      accountStatus: meta?.accountStatus ?? '',
      hasApplication: meta?.hasApplication ?? false,
      latestApplicationId: meta?.latestApplicationId ?? '',
      smsCountdown: countdown,
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
    async sendSms(mobile: string): Promise<void> {
      const r = await apiSendSms({ mobile, scene: 'login' });
      if (r.code !== '0') throw new Error(r.message || '验证码发送失败');
      this.smsCountdown = { startedAt: Date.now(), totalSeconds: 60, mobile };
      uni.setStorageSync(KEY_SMS_COUNTDOWN, JSON.stringify(this.smsCountdown));
    },

    async loginByMobile(mobile: string, code: string, platform: Platform = 'app-android'): Promise<void> {
      const body: LoginReq = { mobile, code, deviceId: this.deviceId, platform };
      const r = await apiLogin(body);
      if (r.code !== '0' || !r.data) throw new Error(r.message || '登录失败');
      this.applyTokens(r.data.riderToken, r.data.refreshToken, {
        riderId: r.data.riderId,
        accountStatus: r.data.accountStatus,
        hasApplication: r.data.hasApplication,
        latestApplicationId: r.data.latestApplicationId,
      });
    },

    async refreshIfPossible(): Promise<boolean> {
      if (!this.refreshToken) return false;
      try {
        const r = await apiRefresh({ refreshToken: this.refreshToken, deviceId: this.deviceId });
        if (r.code !== '0' || !r.data) return false;
        this.applyTokens(r.data.riderToken, r.data.refreshToken, {
          riderId: this.riderId,
          accountStatus: this.accountStatus || 'active',
          hasApplication: this.hasApplication,
          latestApplicationId: this.latestApplicationId,
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
        /* ignore */
      }
      this.clearAll();
    },

    clearAll(): void {
      this.accessToken = '';
      this.refreshToken = '';
      this.riderId = '';
      this.accountStatus = '';
      this.hasApplication = false;
      this.latestApplicationId = '';
      this.smsCountdown = null;
      try {
        clearToken();
        uni.removeStorageSync(KEY_REFRESH);
        uni.removeStorageSync(KEY_AUTH_META);
        uni.removeStorageSync(KEY_SMS_COUNTDOWN);
      } catch {
        /* ignore */
      }
    },

    applyTokens(accessToken: string, refreshToken: string, meta: AuthMeta): void {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.riderId = meta.riderId;
      this.accountStatus = meta.accountStatus;
      this.hasApplication = meta.hasApplication;
      this.latestApplicationId = meta.latestApplicationId ?? '';
      try {
        setToken(accessToken);
        uni.setStorageSync(KEY_REFRESH, refreshToken);
        uni.setStorageSync(KEY_AUTH_META, JSON.stringify(meta));
      } catch {
        /* ignore */
      }
    },

    clearSmsCountdown(): void {
      this.smsCountdown = null;
      try {
        uni.removeStorageSync(KEY_SMS_COUNTDOWN);
      } catch {
        /* ignore */
      }
    },
  },
});

import { defineStore } from 'pinia';

import {
  changeCustomerMobile as apiChangeMobile,
  getCustomerProfile as apiGetProfile,
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefresh,
  sendSmsCode as apiSendSms,
  updateCustomerProfile as apiUpdateProfile,
  wechatLogin as apiWechatLogin,
  type CustomerGender,
  type CustomerProfileVo,
  type CustomerRealnameStatus,
  type LoginReq,
  type Platform,
  type SmsScene,
  type WechatLoginReq,
} from '@/api';
import { clearToken, getToken, setPrincipal, setToken } from '@/utils/token';

export type { CustomerGender, CustomerRealnameStatus } from '@/api';

const NS = 'o2o:customer';
const KEY_REFRESH = `${NS}:refresh`;
const KEY_DEVICE = `${NS}:device-id`;
const KEY_AUTH_META = `${NS}:auth-meta`;
const KEY_SMS_COUNTDOWN = `${NS}:sms-countdown`;
const KEY_PROFILE = `${NS}:profile`;
const KEY_LAST_MOBILE = `${NS}:last-mobile`;

export interface CustomerLocalProfile {
  nickname: string;
  avatarUrl: string;
  gender: CustomerGender;
  birthday: string;
  bio: string;
}

interface AuthMeta {
  isNewUser: boolean;
  profileCompleted: boolean;
  realnameStatus: CustomerRealnameStatus;
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
  realnameStatus: CustomerRealnameStatus;
  mobile: string;
  profile: CustomerLocalProfile;
  smsCountdown: SmsCountdownState | null;
}

const DEFAULT_PROFILE: CustomerLocalProfile = {
  nickname: '用户',
  avatarUrl: '',
  gender: 'unknown',
  birthday: '',
  bio: '',
};

function normalizeRealnameStatus(status: unknown): CustomerRealnameStatus {
  return status === 'pending' || status === 'verified' || status === 'failed' ? status : 'unverified';
}

function normalizeProfile(input: Partial<CustomerLocalProfile> | null | undefined): CustomerLocalProfile {
  return {
    nickname: String(input?.nickname || DEFAULT_PROFILE.nickname).slice(0, 64),
    avatarUrl: String(input?.avatarUrl || ''),
    gender: input?.gender === 'male' || input?.gender === 'female' ? input.gender : 'unknown',
    birthday: String(input?.birthday || ''),
    bio: String(input?.bio || '').slice(0, 120),
  };
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

function readPersisted(): Pick<
  State,
  'refreshToken' | 'isNewUser' | 'profileCompleted' | 'realnameStatus' | 'mobile' | 'profile' | 'smsCountdown'
> {
  let refreshToken = '';
  let meta: AuthMeta = { isNewUser: false, profileCompleted: false, realnameStatus: 'unverified' };
  let mobile = '';
  let profile = { ...DEFAULT_PROFILE };
  let countdown: SmsCountdownState | null = null;

  try {
    refreshToken = (uni.getStorageSync(KEY_REFRESH) as string) || '';
    mobile = (uni.getStorageSync(KEY_LAST_MOBILE) as string) || '';
    const m = uni.getStorageSync(KEY_AUTH_META);
    if (m) {
      const parsed = JSON.parse(m) as Partial<AuthMeta>;
      meta = {
        isNewUser: Boolean(parsed.isNewUser),
        profileCompleted: Boolean(parsed.profileCompleted),
        realnameStatus: normalizeRealnameStatus(parsed.realnameStatus),
      };
    }
    const p = uni.getStorageSync(KEY_PROFILE);
    if (p) profile = normalizeProfile(JSON.parse(p) as Partial<CustomerLocalProfile>);
    const c = uni.getStorageSync(KEY_SMS_COUNTDOWN);
    if (c) countdown = JSON.parse(c) as SmsCountdownState;
  } catch {
    // ignore
  }

  return {
    refreshToken,
    isNewUser: meta.isNewUser,
    profileCompleted: meta.profileCompleted,
    realnameStatus: meta.realnameStatus,
    mobile,
    profile,
    smsCountdown: countdown,
  };
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
      realnameStatus: persisted.realnameStatus,
      mobile: persisted.mobile,
      profile: persisted.profile,
      smsCountdown: persisted.smsCountdown,
    };
  },
  getters: {
    isLoggedIn: (s): boolean => Boolean(s.refreshToken) && Boolean(getToken()),
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
      if (scene === 'login' || scene === 'realname') this.setMobile(mobile);
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
        realnameStatus: this.realnameStatus,
      });
      this.setMobile(mobile);
      await this.syncProfile().catch(() => undefined);
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
        realnameStatus: this.realnameStatus,
      });
      await this.syncProfile().catch(() => undefined);
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
          realnameStatus: this.realnameStatus,
        });
        await this.syncProfile().catch(() => undefined);
        return true;
      } catch {
        return false;
      }
    },

    async logout(): Promise<void> {
      try {
        await apiLogout();
      } catch {
        // ignore
      }
      this.clearAll();
    },

    clearAll(): void {
      this.accessToken = '';
      this.refreshToken = '';
      this.isNewUser = false;
      this.profileCompleted = false;
      this.realnameStatus = 'unverified';
      this.mobile = '';
      this.profile = { ...DEFAULT_PROFILE };
      this.smsCountdown = null;
      try {
        clearToken();
        uni.removeStorageSync(KEY_REFRESH);
        uni.removeStorageSync(KEY_AUTH_META);
        uni.removeStorageSync(KEY_PROFILE);
        uni.removeStorageSync(KEY_LAST_MOBILE);
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
      this.realnameStatus = meta.realnameStatus;
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

    setMobile(mobile: string): void {
      this.mobile = mobile;
      try {
        if (mobile) uni.setStorageSync(KEY_LAST_MOBILE, mobile);
        else uni.removeStorageSync(KEY_LAST_MOBILE);
      } catch {
        // ignore
      }
    },

    updateProfile(patch: Partial<CustomerLocalProfile>): void {
      this.applyLocalProfile({ ...this.profile, ...patch });
    },

    async syncProfile(): Promise<void> {
      if (!this.isLoggedIn) return;
      const r = await apiGetProfile();
      if (r.code !== '0' || !r.data) {
        throw new Error(r.message || '资料同步失败');
      }
      this.applyServerProfile(r.data);
    },

    async saveProfile(patch: CustomerLocalProfile): Promise<void> {
      const next = normalizeProfile(patch);
      const r = await apiUpdateProfile({
        nickname: next.nickname,
        avatarUrl: next.avatarUrl,
        gender: next.gender,
        birthday: next.birthday || undefined,
        bio: next.bio,
      });
      if (r.code !== '0' || !r.data) {
        throw new Error(r.message || '资料保存失败');
      }
      this.applyServerProfile(r.data);
    },

    async changeMobile(mobile: string, code: string): Promise<void> {
      const r = await apiChangeMobile({ mobile, code });
      if (r.code !== '0' || !r.data) {
        throw new Error(r.message || '手机号修改失败');
      }
      this.applyServerProfile(r.data);
    },

    setRealnameStatus(status: CustomerRealnameStatus): void {
      this.realnameStatus = status;
      if (status === 'verified') this.profileCompleted = true;
      this.persistAuthMeta();
    },

    applyLocalProfile(profile: Partial<CustomerLocalProfile>): void {
      this.profile = normalizeProfile(profile);
      this.profileCompleted = Boolean(this.profile.nickname.trim());
      try {
        uni.setStorageSync(KEY_PROFILE, JSON.stringify(this.profile));
      } catch {
        // ignore
      }
      this.persistAuthMeta();
    },

    applyServerProfile(data: CustomerProfileVo): void {
      this.profile = normalizeProfile({
        nickname: data.nickname,
        avatarUrl: data.avatarUrl,
        gender: data.gender,
        birthday: data.birthday,
        bio: data.bio,
      });
      this.mobile = data.mobile;
      this.realnameStatus = normalizeRealnameStatus(data.realnameStatus);
      this.profileCompleted = data.profileCompleted;
      try {
        uni.setStorageSync(KEY_PROFILE, JSON.stringify(this.profile));
        if (this.mobile) uni.setStorageSync(KEY_LAST_MOBILE, this.mobile);
        else uni.removeStorageSync(KEY_LAST_MOBILE);
      } catch {
        // ignore
      }
      this.persistAuthMeta();
    },

    persistAuthMeta(): void {
      try {
        uni.setStorageSync(
          KEY_AUTH_META,
          JSON.stringify({
            isNewUser: this.isNewUser,
            profileCompleted: this.profileCompleted,
            realnameStatus: this.realnameStatus,
          }),
        );
      } catch {
        // ignore
      }
    },
  },
});

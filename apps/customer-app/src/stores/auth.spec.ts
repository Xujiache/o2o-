import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  sendSmsCode: vi.fn(),
  login: vi.fn(),
  wechatLogin: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
}));

import * as api from '@/api';

import { useAuthStore } from './auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // 清掉 setup 的 mock 存储,防止跨测试污染 refresh / smsCountdown
    const u = (globalThis as unknown as { uni: { removeStorageSync: (k: string) => void } }).uni;
    [
      'o2o:customer:token',
      'o2o:customer:principal',
      'o2o:customer:refresh',
      'o2o:customer:auth-meta',
      'o2o:customer:sms-countdown',
    ].forEach((k) => u.removeStorageSync(k));
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('初始状态 isLoggedIn=false,deviceId 自动生成', () => {
    const auth = useAuthStore();
    expect(auth.isLoggedIn).toBe(false);
    expect(auth.deviceId).toMatch(/^dev-/);
  });

  it('sendSms 成功后写入倒计时', async () => {
    vi.mocked(api.sendSmsCode).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: { sendResult: true, expireSeconds: 300, requestId: 'mock-1' },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await auth.sendSms('13800000001', 'login');
    expect(auth.smsCountdown?.mobile).toBe('13800000001');
    expect(auth.smsCountdown?.totalSeconds).toBe(60);
    expect(auth.smsRemainingSeconds).toBeGreaterThan(0);
  });

  it('sendSms 业务失败抛错 + 不写倒计时', async () => {
    vi.mocked(api.sendSmsCode).mockResolvedValueOnce({
      code: 'RATE_LIMIT_EXCEEDED',
      message: '过于频繁',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await expect(auth.sendSms('13800000001', 'login')).rejects.toThrow('过于频繁');
    expect(auth.smsCountdown).toBeNull();
  });

  it('loginByMobile 成功后填充 token + isLoggedIn=true', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: {
        customerToken: 'access-1',
        refreshToken: 'refresh-1',
        isNewUser: true,
        profileCompleted: false,
      },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await auth.loginByMobile('13800000001', '123456');
    expect(auth.accessToken).toBe('access-1');
    expect(auth.refreshToken).toBe('refresh-1');
    expect(auth.isNewUser).toBe(true);
    expect(auth.isLoggedIn).toBe(true);
  });

  it('loginByMobile 业务失败抛错', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      code: 'UNAUTHORIZED',
      message: '验证码错误',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await expect(auth.loginByMobile('13800000001', '999999')).rejects.toThrow('验证码错误');
    expect(auth.isLoggedIn).toBe(false);
  });

  it('loginByWechat bindMobileRequired=true 时 isNewUser=true', async () => {
    vi.mocked(api.wechatLogin).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: {
        customerToken: 'access-w',
        refreshToken: 'refresh-w',
        bindMobileRequired: true,
        isNewUser: true,
      },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    const r = await auth.loginByWechat('mock-jscode');
    expect(r.bindMobileRequired).toBe(true);
    expect(auth.isNewUser).toBe(true);
  });

  it('refreshIfPossible 无 refresh token → 直接 false', async () => {
    const auth = useAuthStore();
    auth.refreshToken = '';
    const r = await auth.refreshIfPossible();
    expect(r).toBe(false);
    expect(api.refreshToken).not.toHaveBeenCalled();
  });

  it('refreshIfPossible 接口失败 → 返回 false 且不抛', async () => {
    vi.mocked(api.refreshToken).mockResolvedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'token revoked',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    auth.refreshToken = 'old-refresh';
    const r = await auth.refreshIfPossible();
    expect(r).toBe(false);
  });

  it('refreshIfPossible 成功 → 轮换 token', async () => {
    vi.mocked(api.refreshToken).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: { customerToken: 'access-2', refreshToken: 'refresh-2' },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    auth.refreshToken = 'refresh-1';
    const r = await auth.refreshIfPossible();
    expect(r).toBe(true);
    expect(auth.accessToken).toBe('access-2');
    expect(auth.refreshToken).toBe('refresh-2');
  });

  it('logout 清空所有 token + 倒计时 + 即使后端失败也清', async () => {
    vi.mocked(api.logout).mockRejectedValueOnce(new Error('network'));
    const auth = useAuthStore();
    auth.accessToken = 'a';
    auth.refreshToken = 'r';
    auth.smsCountdown = { startedAt: Date.now(), totalSeconds: 60, scene: 'login', mobile: 'm' };
    await auth.logout();
    expect(auth.accessToken).toBe('');
    expect(auth.refreshToken).toBe('');
    expect(auth.smsCountdown).toBeNull();
  });

  it('clearSmsCountdown 单独清', () => {
    const auth = useAuthStore();
    auth.smsCountdown = { startedAt: Date.now(), totalSeconds: 60, scene: 'login', mobile: 'x' };
    auth.clearSmsCountdown();
    expect(auth.smsCountdown).toBeNull();
  });

  it('smsRemainingSeconds:倒计时未启时为 0', () => {
    const auth = useAuthStore();
    auth.smsCountdown = null;
    expect(auth.smsRemainingSeconds).toBe(0);
  });

  it('smsRemainingSeconds:已过期时为 0', () => {
    const auth = useAuthStore();
    auth.smsCountdown = { startedAt: Date.now() - 120_000, totalSeconds: 60, scene: 'login', mobile: 'x' };
    expect(auth.smsRemainingSeconds).toBe(0);
  });
});

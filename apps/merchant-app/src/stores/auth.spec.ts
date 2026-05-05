import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  sendSmsCode: vi.fn(),
  login: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
}));

import * as api from '@/api';

import { useAuthStore } from './auth';

describe('merchant useAuthStore', () => {
  beforeEach(() => {
    const u = (globalThis as unknown as { uni: { removeStorageSync: (k: string) => void } }).uni;
    ['o2o:merchant:token', 'o2o:merchant:refresh', 'o2o:merchant:auth-meta', 'o2o:merchant:sms-countdown'].forEach(
      (k) => u.removeStorageSync(k),
    );
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('初始状态:isLoggedIn=false + deviceId 自动生成', () => {
    const auth = useAuthStore();
    expect(auth.isLoggedIn).toBe(false);
    expect(auth.deviceId).toMatch(/^mer-/);
  });

  it('sendSms 成功 → 写入 60s 倒计时', async () => {
    vi.mocked(api.sendSmsCode).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: { sendResult: true, expireSeconds: 300, requestId: 'mock-1' },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await auth.sendSms('13800000001');
    expect(auth.smsCountdown?.mobile).toBe('13800000001');
    expect(auth.smsRemainingSeconds).toBeGreaterThan(0);
  });

  it('sendSms 业务失败 → 抛错', async () => {
    vi.mocked(api.sendSmsCode).mockResolvedValueOnce({
      code: 'RATE_LIMIT_EXCEEDED',
      message: '过于频繁',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await expect(auth.sendSms('13800000001')).rejects.toThrow('过于频繁');
  });

  it('loginByMobile 成功 → 填充 token + accountStatus', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: { merchantToken: 'access-1', refreshToken: 'refresh-1', accountStatus: 'active' },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await auth.loginByMobile('13800000001', '123456');
    expect(auth.accessToken).toBe('access-1');
    expect(auth.refreshToken).toBe('refresh-1');
    expect(auth.accountStatus).toBe('active');
    expect(auth.isLoggedIn).toBe(true);
  });

  it('loginByMobile 业务失败 → 抛错', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      code: 'NOT_FOUND',
      message: '请先入驻',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    await expect(auth.loginByMobile('13800000001', '999999')).rejects.toThrow('请先入驻');
    expect(auth.isLoggedIn).toBe(false);
  });

  it('refreshIfPossible 无 refresh token → false', async () => {
    const auth = useAuthStore();
    auth.refreshToken = '';
    expect(await auth.refreshIfPossible()).toBe(false);
  });

  it('refreshIfPossible 后端失败 → false 不抛', async () => {
    vi.mocked(api.refreshToken).mockResolvedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'expired',
      data: null,
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    auth.refreshToken = 'old';
    expect(await auth.refreshIfPossible()).toBe(false);
  });

  it('refreshIfPossible 成功 → 轮换', async () => {
    vi.mocked(api.refreshToken).mockResolvedValueOnce({
      code: '0',
      message: 'ok',
      data: { merchantToken: 'access-2', refreshToken: 'refresh-2' },
      traceId: 't',
      timestamp: Date.now(),
    });
    const auth = useAuthStore();
    auth.refreshToken = 'refresh-1';
    auth.accountStatus = 'active';
    const ok = await auth.refreshIfPossible();
    expect(ok).toBe(true);
    expect(auth.accessToken).toBe('access-2');
  });

  it('logout 清空(即使后端失败也清)', async () => {
    vi.mocked(api.logout).mockRejectedValueOnce(new Error('network'));
    const auth = useAuthStore();
    auth.accessToken = 'a';
    auth.refreshToken = 'r';
    auth.accountStatus = 'active';
    await auth.logout();
    expect(auth.accessToken).toBe('');
    expect(auth.isLoggedIn).toBe(false);
  });

  it('clearSmsCountdown 单独清', () => {
    const auth = useAuthStore();
    auth.smsCountdown = { startedAt: Date.now(), totalSeconds: 60, mobile: 'x' };
    auth.clearSmsCountdown();
    expect(auth.smsCountdown).toBeNull();
  });

  it('smsRemainingSeconds 已过期 → 0', () => {
    const auth = useAuthStore();
    auth.smsCountdown = { startedAt: Date.now() - 120_000, totalSeconds: 60, mobile: 'x' };
    expect(auth.smsRemainingSeconds).toBe(0);
  });
});

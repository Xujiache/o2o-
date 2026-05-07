import { vi } from 'vitest';

const storage = new Map<string, string>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).uni = {
  getStorageSync: vi.fn((k: string) => storage.get(k) ?? ''),
  setStorageSync: vi.fn((k: string, v: string) => storage.set(k, v)),
  removeStorageSync: vi.fn((k: string) => storage.delete(k)),
  reLaunch: vi.fn(),
  navigateTo: vi.fn(),
  request: vi.fn(),
  uploadFile: vi.fn(),
  // 定位授权:测试默认通过
  authorize: vi.fn((opt: { success?: () => void }) => opt.success?.()),
  // 单点定位:测试默认返回北京天安门附近(与 demo seed 一致)
  getLocation: vi.fn((opt: { success?: (res: { latitude: number; longitude: number; accuracy: number }) => void }) =>
    opt.success?.({ latitude: 39.9042, longitude: 116.4074, accuracy: 50 }),
  ),
};

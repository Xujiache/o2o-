/**
 * Uni-app 测试 setup:Node 环境下补全 `uni` / `import.meta.env` 等全局,
 * 让 utils / services 能直接 import 而不抛错。
 */
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
  chooseImage: vi.fn(),
  showToast: vi.fn(),
  getLocation: vi.fn(),
};

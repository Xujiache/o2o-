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
};

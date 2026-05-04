import { describe, expect, it } from 'vitest';

import { Endpoints } from './index';

describe('customer-app endpoints', () => {
  it('Stage 1 接口路径与后端契约一致', () => {
    expect(Endpoints.SmsCode).toBe('/api/v1/c/auth/sms-code');
    expect(Endpoints.Login).toBe('/api/v1/c/auth/login');
    expect(Endpoints.WechatLogin).toBe('/api/v1/c/auth/wechat-login');
    expect(Endpoints.Refresh).toBe('/api/v1/c/auth/refresh');
    expect(Endpoints.Logout).toBe('/api/v1/c/auth/logout');
    expect(Endpoints.RealnameVerify).toBe('/api/v1/c/realname/verify');
    expect(Endpoints.Addresses).toBe('/api/v1/c/addresses');
  });

  it('Stage 0 endpoint 保留', () => {
    expect(Endpoints.Dictionaries).toBe('/api/v1/pub/dictionaries');
    expect(Endpoints.Cities).toBe('/api/v1/pub/cities');
    expect(Endpoints.FilesUpload).toBe('/api/v1/pub/files/upload');
  });

  it('所有 endpoint 全部以 /api/v1 开头', () => {
    for (const v of Object.values(Endpoints)) {
      expect(v).toMatch(/^\/api\/v1\//);
    }
  });
});

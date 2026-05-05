import { describe, expect, it } from 'vitest';

import { AdminAuthEndpoints } from './admin-auth';

describe('admin-auth endpoints', () => {
  it('captcha / login / refresh / logout 路径', () => {
    expect(AdminAuthEndpoints.Captcha).toBe('/api/v1/admin/auth/captcha');
    expect(AdminAuthEndpoints.Login).toBe('/api/v1/admin/auth/login');
    expect(AdminAuthEndpoints.Refresh).toBe('/api/v1/admin/auth/refresh');
    expect(AdminAuthEndpoints.Logout).toBe('/api/v1/admin/auth/logout');
  });
});

import { describe, expect, it } from 'vitest';

import { Endpoints } from './index';

describe('merchant-app endpoints', () => {
  it('接口路径与后端契约一致', () => {
    expect(Endpoints.SmsCode).toBe('/api/v1/m/auth/sms-code');
    expect(Endpoints.Login).toBe('/api/v1/m/auth/login');
    expect(Endpoints.Refresh).toBe('/api/v1/m/auth/refresh');
    expect(Endpoints.Logout).toBe('/api/v1/m/auth/logout');
    expect(Endpoints.OnboardingApply).toBe('/api/v1/m/onboarding/applications');
    expect(Endpoints.OnboardingStatus).toBe('/api/v1/m/onboarding/status');
    expect(Endpoints.Store).toBe('/api/v1/m/store');
    expect(Endpoints.StoreSettings).toBe('/api/v1/m/store/settings');
    expect(Endpoints.StoreBusinessStatus).toBe('/api/v1/m/store/business-status');
    expect(Endpoints.ProductCategories).toBe('/api/v1/m/product-categories');
    expect(Endpoints.Products).toBe('/api/v1/m/products');
    expect(Endpoints.StockAlerts).toBe('/api/v1/m/stock/alerts');
    expect(Endpoints.Promotions).toBe('/api/v1/m/promotions');
  });

  it('全部以 /api/v1 开头', () => {
    for (const v of Object.values(Endpoints)) {
      expect(v).toMatch(/^\/api\/v1\//);
    }
  });
});

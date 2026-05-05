import { describe, expect, it } from 'vitest';

import { MerchantEndpoints } from './admin-merchants';

describe('admin-merchants endpoints', () => {
  it('Applications 列表路径', () => {
    expect(MerchantEndpoints.Applications).toBe('/api/v1/admin/merchants/applications');
  });
  it('ApplicationDetail(id) 拼路径', () => {
    expect(MerchantEndpoints.ApplicationDetail('100')).toBe('/api/v1/admin/merchants/applications/100');
  });
  it('Audit(id) 拼路径', () => {
    expect(MerchantEndpoints.Audit('100')).toBe('/api/v1/admin/merchants/100/audit');
  });
  it('Stores 列表路径', () => {
    expect(MerchantEndpoints.Stores).toBe('/api/v1/admin/merchants/stores');
  });
  it('StoreBusinessStatus(id) 拼路径', () => {
    expect(MerchantEndpoints.StoreBusinessStatus('201')).toBe('/api/v1/admin/merchants/stores/201/business-status');
  });
});

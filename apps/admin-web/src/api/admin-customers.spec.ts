import { describe, expect, it } from 'vitest';

import { CustomerEndpoints } from './admin-customers';

describe('admin-customers endpoints', () => {
  it('List 路径正确', () => {
    expect(CustomerEndpoints.List).toBe('/api/v1/admin/customers');
  });
  it('Detail(id) 拼路径', () => {
    expect(CustomerEndpoints.Detail('123')).toBe('/api/v1/admin/customers/123');
  });
  it('RealnameRecords(id) 拼路径', () => {
    expect(CustomerEndpoints.RealnameRecords('456')).toBe('/api/v1/admin/customers/456/realname-records');
  });
  it('ChangeStatus(id) 拼路径', () => {
    expect(CustomerEndpoints.ChangeStatus('789')).toBe('/api/v1/admin/customers/789/status');
  });
});

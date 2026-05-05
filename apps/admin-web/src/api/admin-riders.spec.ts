import { describe, expect, it } from 'vitest';

import { RiderEndpoints } from './admin-riders';

describe('admin-riders endpoints', () => {
  it('Riders 列表路径', () => {
    expect(RiderEndpoints.Riders).toBe('/api/v1/admin/riders');
  });
  it('Detail(id) 拼路径', () => {
    expect(RiderEndpoints.Detail('100')).toBe('/api/v1/admin/riders/100');
  });
  it('Audit(id) 拼路径', () => {
    expect(RiderEndpoints.Audit('100')).toBe('/api/v1/admin/riders/100/audit');
  });
  it('Status(id) 拼路径', () => {
    expect(RiderEndpoints.Status('100')).toBe('/api/v1/admin/riders/100/status');
  });
  it('ServiceArea(id) 拼路径', () => {
    expect(RiderEndpoints.ServiceArea('100')).toBe('/api/v1/admin/riders/100/service-area');
  });
});

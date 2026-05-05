import { describe, expect, it } from 'vitest';

import { SystemConfigEndpoints } from './admin-system-config';

describe('admin-system-config endpoints', () => {
  it('List 与 Detail 路径', () => {
    expect(SystemConfigEndpoints.List).toBe('/api/v1/admin/system-config');
    expect(SystemConfigEndpoints.Detail('order.takeaway.wait_pay_minutes')).toBe(
      '/api/v1/admin/system-config/order.takeaway.wait_pay_minutes',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { CityEndpoints } from './admin-cities';

describe('admin-cities endpoints', () => {
  it('List 与 Detail 路径符合 /api/v1/admin/cities*', () => {
    expect(CityEndpoints.List).toBe('/api/v1/admin/cities');
    expect(CityEndpoints.Detail('BJ')).toBe('/api/v1/admin/cities/BJ');
  });
});

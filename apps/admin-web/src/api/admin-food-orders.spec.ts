import { describe, expect, it } from 'vitest';

import { AdminFoodOrderEndpoints } from './admin-food-orders';

describe('admin-food-orders endpoints', () => {
  it('List / Detail / Stats 路径', () => {
    expect(AdminFoodOrderEndpoints.List).toBe('/api/v1/admin/food-orders');
    expect(AdminFoodOrderEndpoints.Detail('700001')).toBe('/api/v1/admin/food-orders/700001');
    expect(AdminFoodOrderEndpoints.Stats).toBe('/api/v1/admin/food-orders/timeline-statistics');
  });
});

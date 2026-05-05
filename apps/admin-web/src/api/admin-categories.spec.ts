import { describe, expect, it } from 'vitest';

import { CategoryEndpoints } from './admin-categories';

describe('admin-categories endpoints', () => {
  it('Tree 与 Detail 路径', () => {
    expect(CategoryEndpoints.Tree).toBe('/api/v1/admin/categories');
    expect(CategoryEndpoints.Detail('1')).toBe('/api/v1/admin/categories/1');
  });
});

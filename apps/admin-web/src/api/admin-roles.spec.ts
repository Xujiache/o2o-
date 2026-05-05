import { describe, expect, it } from 'vitest';

import { RoleEndpoints } from './admin-roles';

describe('admin-roles endpoints', () => {
  it('Roles / Permissions / RolePermissions 路径', () => {
    expect(RoleEndpoints.Roles).toBe('/api/v1/admin/roles');
    expect(RoleEndpoints.Permissions).toBe('/api/v1/admin/permissions');
    expect(RoleEndpoints.RolePermissions('5')).toBe('/api/v1/admin/roles/5/permissions');
  });
});

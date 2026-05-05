import { describe, expect, it } from 'vitest';

import { ThirdPartyEndpoints } from './admin-third-party';

describe('admin-third-party endpoints', () => {
  it('List 与 Detail 路径', () => {
    expect(ThirdPartyEndpoints.List).toBe('/api/v1/admin/integrations');
    expect(ThirdPartyEndpoints.Detail('ali-realname')).toBe('/api/v1/admin/integrations/ali-realname');
  });
});

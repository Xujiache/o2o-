import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { encryptSecret } from '../../common/utils/cipher.util';
import type { ThirdPartyConfig } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AdminThirdPartyConfigService } from './admin-third-party-config.service';

describe('AdminThirdPartyConfigService', () => {
  let svc: AdminThirdPartyConfigService;
  let configs: ThirdPartyConfig[];
  let repo: jest.Mocked<Repository<ThirdPartyConfig>>;
  let bus: jest.Mocked<DomainEventBus>;
  let published: Array<{ name: string; payload: unknown }>;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    configs = [
      {
        id: '1',
        provider: 'ali-realname',
        env: 'development',
        encryptedSecret: encryptSecret('original-secret-12345'),
        status: 'active',
        lastHealthAt: null,
        errorMessage: null,
        updatedAt: '0',
      } as ThirdPartyConfig,
    ];

    repo = {
      find: jest.fn(async () => configs),
      findOne: jest.fn(
        async ({ where }: { where: Partial<ThirdPartyConfig> }) =>
          configs.find((c) => c.provider === where.provider && c.env === where.env) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<ThirdPartyConfig>, patch: Partial<ThirdPartyConfig>) => {
        const idx = configs.findIndex((c) => c.id === criteria.id);
        if (idx >= 0) configs[idx] = { ...configs[idx]!, ...patch };
        return { affected: 1, raw: [] };
      }),
    } as unknown as jest.Mocked<Repository<ThirdPartyConfig>>;

    published = [];
    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        published.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AdminThirdPartyConfigService(repo, bus);
  });

  it('list 返 secret 脱敏', async () => {
    const r = await svc.list();
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.secretMasked).toBe('ori***345');
  });

  it('detail 不存在 → NotFound', async () => {
    await expect(svc.detail('no-such')).rejects.toThrow(NotFoundException);
  });

  it('update secret + status → 加密存储 + 发 ThirdPartyConfigChanged', async () => {
    const r = await svc.update('ali-realname', { secret: 'new-secret-67890', status: 'disabled' }, 'admin-1');
    expect(r.changedFields).toEqual(['secret', 'status']);
    expect(configs[0]!.status).toBe('disabled');
    expect(configs[0]!.encryptedSecret).toMatch(/^aes256\$/);
    expect(published).toHaveLength(1);
    expect(published[0]).toEqual(
      expect.objectContaining({
        name: EventName.ThirdPartyConfigChanged,
        payload: expect.objectContaining({
          provider: 'ali-realname',
          changedFields: ['secret', 'status'],
          operatorAdminId: 'admin-1',
        }),
      }),
    );
  });

  it('update 空请求 → 不发事件', async () => {
    const r = await svc.update('ali-realname', {}, 'admin-1');
    expect(r.changedFields).toEqual([]);
    expect(published).toHaveLength(0);
  });

  it('update 同 status → 不算 changedFields', async () => {
    const r = await svc.update('ali-realname', { status: 'active' }, 'admin-1');
    expect(r.changedFields).toEqual([]);
  });

  it('update secret 空字符串 → 不修改', async () => {
    const r = await svc.update('ali-realname', { secret: '' }, 'admin-1');
    expect(r.changedFields).toEqual([]);
  });

  it('detail 单 provider → secret 脱敏返,encryptedSecret 不外漏', async () => {
    const r = await svc.detail('ali-realname');
    expect(r.provider).toBe('ali-realname');
    expect(r.secretMasked).toBe('ori***345');
    expect(JSON.stringify(r)).not.toContain('aes256$');
    expect(JSON.stringify(r)).not.toContain('original-secret');
  });
});

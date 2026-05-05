import { UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { SysConfig } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AdminSystemConfigService } from './admin-system-config.service';

describe('AdminSystemConfigService', () => {
  let svc: AdminSystemConfigService;
  let configs: SysConfig[];
  let repo: jest.Mocked<Repository<SysConfig>>;
  let bus: jest.Mocked<DomainEventBus>;
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  beforeEach(() => {
    configs = [
      {
        id: '1',
        configKey: 'order.takeaway.wait_pay_minutes',
        configValue: '15',
        scope: 'global',
        description: '外卖订单待支付超时',
        updatedAt: '0',
      } as SysConfig,
    ];

    repo = {
      find: jest.fn(async () => configs),
      findOne: jest.fn(
        async ({ where }: { where: Partial<SysConfig> }) =>
          configs.find((c) => c.configKey === where.configKey) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<SysConfig>, patch: Partial<SysConfig>) => {
        const idx = configs.findIndex((c) => c.id === criteria.id);
        if (idx >= 0) configs[idx] = { ...configs[idx]!, ...patch };
        return { affected: 1, raw: [] };
      }),
    } as unknown as jest.Mocked<Repository<SysConfig>>;

    publishedEvents = [];
    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AdminSystemConfigService(repo, bus);
  });

  it('list 返 seed 行', async () => {
    const r = await svc.list();
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.configKey).toBe('order.takeaway.wait_pay_minutes');
  });

  it('update 不存在 key → SYSTEM_CONFIG_KEY_UNKNOWN', async () => {
    await expect(svc.update('no.such.key', '99', 'admin-1')).rejects.toThrow(UnprocessableEntityException);
  });

  it('update 同值 → 不发事件', async () => {
    const r = await svc.update('order.takeaway.wait_pay_minutes', '15', 'admin-1');
    expect(r.configValue).toBe('15');
    expect(publishedEvents).toHaveLength(0);
  });

  it('update 新值 → 发 ConfigChanged', async () => {
    const r = await svc.update('order.takeaway.wait_pay_minutes', '30', 'admin-1');
    expect(r.configValue).toBe('30');
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.ConfigChanged,
        payload: expect.objectContaining({
          configKey: 'order.takeaway.wait_pay_minutes',
          oldValue: '15',
          newValue: '30',
          operator: 'admin-1',
        }),
      }),
    ]);
  });

  it('update 后 updatedAt 刷新且行内容反映新值', async () => {
    const before = Number(configs[0]!.updatedAt);
    const r = await svc.update('order.takeaway.wait_pay_minutes', '60', 'admin-1');
    expect(Number(r.updatedAt)).toBeGreaterThan(before);
    expect(configs[0]!.configValue).toBe('60');
  });
});

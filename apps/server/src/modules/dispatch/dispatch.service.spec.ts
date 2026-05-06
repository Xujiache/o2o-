import type { DispatchTask, RiderStatus, SysConfig } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';

import { DispatchService } from './dispatch.service';

interface World {
  dispatches: DispatchTask[];
  riders: RiderStatus[];
  configs: SysConfig[];
  events: { name: string; payload: unknown }[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dispatchRepo: any = {
    findOne: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return (
        w.dispatches.find((d) => {
          if (where.bizType && d.bizType !== where.bizType) return false;
          if (where.bizOrderId && d.bizOrderId !== where.bizOrderId) return false;
          if (where.dispatchTaskId && d.dispatchTaskId !== where.dispatchTaskId) return false;
          if (where.status?._type === 'in') {
            if (!(where.status._value as string[]).includes(d.status)) return false;
          }
          return true;
        }) ?? null
      );
    }),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, dispatchTaskId: String(w.dispatches.length + 1) };
      w.dispatches.push(inserted);
      return inserted;
    }),
    update: jest.fn(async (where: any, set: any) => {
      const d = w.dispatches.find((x) => x.dispatchTaskId === where.dispatchTaskId);
      if (d) Object.assign(d, set);
    }),
  };
  const riderStatusRepo: any = {
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.riders.filter((r) => (where.onlineStatus ? r.onlineStatus === where.onlineStatus : true));
    }),
  };
  const sysConfigRepo: any = {
    findOne: jest.fn(async (opt: any) => w.configs.find((c) => c.configKey === opt.where.configKey) ?? null),
  };
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const svc = new DispatchService(dispatchRepo, riderStatusRepo, sysConfigRepo, eventBus);
  return { svc };
  /* eslint-enable */
}

describe('DispatchService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      dispatches: [],
      riders: [
        { riderId: '30001', onlineStatus: 'online' } as RiderStatus,
        { riderId: '30002', onlineStatus: 'offline' } as RiderStatus,
      ],
      configs: [],
      events: [],
    };
  });

  it('成功派单 → 创 dispatch_task + emit DispatchStarted + 仅在线骑手为候选', async () => {
    const { svc } = buildService(w);
    const r = await svc.dispatch({ bizType: 'FOOD', bizOrderId: '510001' });
    expect(r.status).toBe('PENDING');
    expect(r.candidateRiderIds).toEqual(['30001']);
    expect(w.events[0]!.name).toBe('domain.dispatch.started');
  });

  it('幂等:同一 bizOrderId 重复调用返回既有派单', async () => {
    const { svc } = buildService(w);
    const r1 = await svc.dispatch({ bizType: 'FOOD', bizOrderId: '510001' });
    const r2 = await svc.dispatch({ bizType: 'FOOD', bizOrderId: '510001' });
    expect(r2.dispatchTaskId).toBe(r1.dispatchTaskId);
    expect(w.events.length).toBe(1);
  });

  it('无在线骑手时仍创 PENDING dispatch_task', async () => {
    w.riders = [];
    const { svc } = buildService(w);
    const r = await svc.dispatch({ bizType: 'ERRAND', bizOrderId: '610001', bizTaskId: '600001' });
    expect(r.status).toBe('PENDING');
    expect(r.candidateRiderIds).toEqual([]);
  });

  it('sys_config dispatch.timeout_seconds 生效', async () => {
    w.configs.push({ configKey: 'dispatch.timeout_seconds', configValue: '60' } as SysConfig);
    const { svc } = buildService(w);
    const r = await svc.dispatch({ bizType: 'FOOD', bizOrderId: '510001' });
    expect(Number(r.timeoutAt) - Number(r.dispatchedAt)).toBe(60_000);
  });

  it('markDispatched / markTimeout 正确更新状态', async () => {
    const { svc } = buildService(w);
    const r = await svc.dispatch({ bizType: 'FOOD', bizOrderId: '510001' });
    await svc.markDispatched(r.dispatchTaskId, '30001');
    expect(w.dispatches[0]!.status).toBe('DISPATCHED');
    await svc.markTimeout(r.dispatchTaskId);
    expect(w.dispatches[0]!.status).toBe('TIMEOUT');
  });

  it('findById 不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.findById('999')).rejects.toThrow();
  });
});

import type { DispatchTask, ManualDispatchLog } from '../../database/entities';

import { ManualDispatchService } from './manual-dispatch.service';

interface World {
  tasks: DispatchTask[];
  logs: ManualDispatchLog[];
  events: Array<{ name: string }>;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dispatchRepo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.dispatchTaskId === opt.where.dispatchTaskId) ?? null),
    save: jest.fn(async (t: DispatchTask) => {
      const idx = w.tasks.findIndex((x) => x.dispatchTaskId === t.dispatchTaskId);
      if (idx >= 0) w.tasks[idx] = t;
      return t;
    }),
  };
  const logRepo: any = {
    create: jest.fn((p: any) => ({ ...p }) as ManualDispatchLog),
    save: jest.fn(async (l: ManualDispatchLog) => {
      const item = { ...l, logId: String(w.logs.length + 1) } as ManualDispatchLog;
      w.logs.push(item);
      return item;
    }),
  };
  const eventBus: any = {
    publish: jest.fn(async (name: string) => {
      w.events.push({ name });
      return { eventId: 'e1' };
    }),
  };
  return { svc: new ManualDispatchService(dispatchRepo, logRepo, eventBus) };
  /* eslint-enable */
}

describe('ManualDispatchService', () => {
  it('manualAssign: PENDING → DISPATCHED + 写 log + emit 2 events', async () => {
    const w: World = {
      tasks: [
        {
          dispatchTaskId: 'D1',
          status: 'PENDING',
          acceptedRiderId: null,
          dispatchedAt: '0',
          updatedAt: '0',
        } as unknown as DispatchTask,
      ],
      logs: [],
      events: [],
    };
    const { svc } = buildService(w);
    const r = await svc.manualAssign('D1', { riderId: 'R1', reason: 'rebalance' }, '1');
    expect(r.dispatchStatus).toBe('DISPATCHED');
    expect(w.tasks[0]?.acceptedRiderId).toBe('R1');
    expect(w.logs).toHaveLength(1);
    expect(w.events.map((e) => e.name).sort()).toEqual([
      'domain.dispatch.manual-created',
      'domain.dispatch.order-reassigned',
    ]);
  });

  it('manualAssign: TIMEOUT 也允许', async () => {
    const w: World = {
      tasks: [
        {
          dispatchTaskId: 'D2',
          status: 'TIMEOUT',
          acceptedRiderId: null,
          dispatchedAt: '0',
          updatedAt: '0',
        } as unknown as DispatchTask,
      ],
      logs: [],
      events: [],
    };
    const { svc } = buildService(w);
    const r = await svc.manualAssign('D2', { riderId: 'R2' }, '1');
    expect(r.dispatchStatus).toBe('DISPATCHED');
  });

  it('manualAssign: 找不到 → throw NotFoundException', async () => {
    const w: World = { tasks: [], logs: [], events: [] };
    const { svc } = buildService(w);
    await expect(svc.manualAssign('999', { riderId: 'R1' }, '1')).rejects.toThrow();
  });

  it('manualAssign: DISPATCHED 状态拒绝', async () => {
    const w: World = {
      tasks: [{ dispatchTaskId: 'D3', status: 'DISPATCHED' } as unknown as DispatchTask],
      logs: [],
      events: [],
    };
    const { svc } = buildService(w);
    await expect(svc.manualAssign('D3', { riderId: 'R1' }, '1')).rejects.toThrow();
  });
});

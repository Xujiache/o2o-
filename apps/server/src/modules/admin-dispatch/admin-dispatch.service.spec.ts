import { NotFoundException } from '@nestjs/common';

import type { DispatchTask } from '../../database/entities';

import { AdminDispatchService } from './admin-dispatch.service';

interface World {
  tasks: DispatchTask[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.dispatchTaskId === opt.where.dispatchTaskId) ?? null),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.tasks.filter((t) => {
        if (where.status && t.status !== where.status) return false;
        if (where.bizType && t.bizType !== where.bizType) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new AdminDispatchService(repo) };
  /* eslint-enable */
}

describe('AdminDispatchService', () => {
  it('list 默认 + status/bizType 过滤', async () => {
    const w: World = {
      tasks: [
        {
          dispatchTaskId: '1',
          bizType: 'FOOD',
          bizOrderId: '510001',
          status: 'PENDING',
          retryCount: 0,
          dispatchedAt: '0',
          timeoutAt: '0',
          completedAt: null,
          candidateRiderIds: [],
          acceptedRiderId: null,
          bizTaskId: null,
        } as unknown as DispatchTask,
      ],
    };
    const { svc } = buildService(w);
    expect((await svc.list({})).total).toBe(1);
    expect((await svc.list({ status: 'TIMEOUT' })).total).toBe(0);
    expect((await svc.list({ bizType: 'ERRAND' })).total).toBe(0);
  });

  it('detail 包含 candidateRiderIds', async () => {
    const w: World = {
      tasks: [
        {
          dispatchTaskId: '1',
          bizType: 'FOOD',
          bizOrderId: '510001',
          candidateRiderIds: ['30001', '30002'],
          status: 'PENDING',
          retryCount: 0,
          dispatchedAt: '0',
          timeoutAt: '0',
          completedAt: null,
          acceptedRiderId: null,
          bizTaskId: null,
        } as unknown as DispatchTask,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.detail('1');
    expect(r.candidateRiderIds).toEqual(['30001', '30002']);
  });

  it('detail 不存在抛 NotFound', async () => {
    const { svc } = buildService({ tasks: [] });
    await expect(svc.detail('999')).rejects.toThrow(NotFoundException);
  });
});

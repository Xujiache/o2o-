import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ErrandOrder, ErrandTimeline, FoodOrder, OrderTimeline } from '../../database/entities';

import { CustomerOrdersService } from './customer-orders.service';

const C1 = '1001';
const O_FOOD = '510001';
const O_ERR = '610001';

function buildRepo<T>(rows: T[] = [], findOneImpl?: (where: unknown) => T | null) {
  return {
    findOne: jest.fn(({ where }: { where: unknown }) =>
      Promise.resolve(findOneImpl ? findOneImpl(where) : (rows[0] ?? null)),
    ),
    find: jest.fn(() => Promise.resolve(rows)),
  };
}

describe('CustomerOrdersService', () => {
  it('FOOD timeline: 返回归属本人的 + 转换格式', async () => {
    const foodRepo = buildRepo([{ foodOrderId: O_FOOD, customerId: C1, status: 'PAID_WAIT_MERCHANT' } as FoodOrder]);
    const errandRepo = buildRepo<ErrandOrder>([]);
    const otRepo = buildRepo([
      { createdAt: '100', fromStatus: 'WAIT_PAY', toStatus: 'PAID_WAIT_MERCHANT', actorType: 'system', reason: 'cb' },
    ] as OrderTimeline[]);
    const etRepo = buildRepo<ErrandTimeline>([]);

    const m = await Test.createTestingModule({
      providers: [
        CustomerOrdersService,
        { provide: getRepositoryToken(FoodOrder), useValue: foodRepo },
        { provide: getRepositoryToken(ErrandOrder), useValue: errandRepo },
        { provide: getRepositoryToken(OrderTimeline), useValue: otRepo },
        { provide: getRepositoryToken(ErrandTimeline), useValue: etRepo },
      ],
    }).compile();
    const svc = m.get(CustomerOrdersService);
    const r = await svc.getTimeline(C1, 'FOOD', O_FOOD);
    expect(r.currentStatus).toBe('PAID_WAIT_MERCHANT');
    expect(r.timeline).toHaveLength(1);
    expect(r.availableActions).toEqual([]);
  });

  it('FOOD timeline: 越权 FORBIDDEN', async () => {
    const foodRepo = buildRepo([{ foodOrderId: O_FOOD, customerId: '999', status: 'PAID_WAIT_MERCHANT' } as FoodOrder]);
    const m = await Test.createTestingModule({
      providers: [
        CustomerOrdersService,
        { provide: getRepositoryToken(FoodOrder), useValue: foodRepo },
        { provide: getRepositoryToken(ErrandOrder), useValue: buildRepo([]) },
        { provide: getRepositoryToken(OrderTimeline), useValue: buildRepo([]) },
        { provide: getRepositoryToken(ErrandTimeline), useValue: buildRepo([]) },
      ],
    }).compile();
    await expect(m.get(CustomerOrdersService).getTimeline(C1, 'FOOD', O_FOOD)).rejects.toThrow(ForbiddenException);
  });

  it('ERRAND timeline: 不存在 NOT_FOUND', async () => {
    const m = await Test.createTestingModule({
      providers: [
        CustomerOrdersService,
        { provide: getRepositoryToken(FoodOrder), useValue: buildRepo([]) },
        { provide: getRepositoryToken(ErrandOrder), useValue: buildRepo([]) },
        { provide: getRepositoryToken(OrderTimeline), useValue: buildRepo([]) },
        { provide: getRepositoryToken(ErrandTimeline), useValue: buildRepo([]) },
      ],
    }).compile();
    await expect(m.get(CustomerOrdersService).getTimeline(C1, 'ERRAND', O_ERR)).rejects.toThrow(NotFoundException);
  });
});

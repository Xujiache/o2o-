import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  DispatchTask,
  ErrandOrder,
  ErrandTimeline,
  FoodOrder,
  ManualDispatchLog,
  OrderTimeline,
  PaymentOrder,
  SysAuditLog,
} from '../../database/entities';

import { AdminOrdersService } from './admin-orders.service';

const O = '510001';

function fakeRepo(rows: unknown[] = []) {
  return {
    findOne: jest.fn(() => Promise.resolve(rows[0] ?? null)),
    find: jest.fn(() => Promise.resolve(rows)),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => Promise.resolve(rows)),
    })),
  };
}

async function build(repos: Record<string, ReturnType<typeof fakeRepo>>) {
  const m = await Test.createTestingModule({
    providers: [
      AdminOrdersService,
      { provide: getRepositoryToken(FoodOrder), useValue: repos.food ?? fakeRepo() },
      { provide: getRepositoryToken(ErrandOrder), useValue: repos.errand ?? fakeRepo() },
      { provide: getRepositoryToken(OrderTimeline), useValue: repos.ot ?? fakeRepo() },
      { provide: getRepositoryToken(ErrandTimeline), useValue: repos.et ?? fakeRepo() },
      { provide: getRepositoryToken(SysAuditLog), useValue: repos.audit ?? fakeRepo() },
      { provide: getRepositoryToken(DispatchTask), useValue: repos.dispatch ?? fakeRepo() },
      { provide: getRepositoryToken(ManualDispatchLog), useValue: repos.manual ?? fakeRepo() },
      { provide: getRepositoryToken(PaymentOrder), useValue: repos.pay ?? fakeRepo() },
    ],
  }).compile();
  return m.get(AdminOrdersService);
}

describe('AdminOrdersService', () => {
  it('FOOD: 聚合 timeline + operator + dispatch + payment', async () => {
    const svc = await build({
      food: fakeRepo([{ foodOrderId: O, status: 'DELIVERED' }]),
      ot: fakeRepo([
        {
          createdAt: '100',
          fromStatus: 'PAID_WAIT_MERCHANT',
          toStatus: 'PREPARING',
          actorType: 'merchant',
          reason: null,
        },
      ]),
      audit: fakeRepo([
        {
          createdAt: '101',
          operatorType: 'merchant',
          operatorId: 'M1',
          beforeStatus: null,
          afterStatus: null,
          summary: 'accept',
        },
      ]),
      dispatch: fakeRepo([{ dispatchTaskId: 'D1', bizType: 'FOOD', bizOrderId: O }]),
      manual: fakeRepo([
        {
          createdAt: '102',
          dispatchTaskId: 'D1',
          riderId: 'R1',
          operatorAdminId: '1',
          beforeStatus: 'PENDING',
          afterStatus: 'ASSIGNED',
          reason: 'rebalance',
        },
      ]),
      pay: fakeRepo([
        {
          paymentOrderId: 'P1',
          payOrderNo: 'PN1',
          payChannel: 'wxpay',
          status: 'success',
          paidAmount: '9900',
          paidAt: '99',
          channelTradeNo: 'wx_x',
        },
      ]),
    });
    const r = await svc.getTimeline('FOOD', O);
    expect(r.currentStatus).toBe('DELIVERED');
    expect(r.timeline).toHaveLength(1);
    expect(r.operatorLogs).toHaveLength(1);
    expect(r.dispatchLogs).toHaveLength(1);
    expect(r.paymentLogs[0]?.channel).toBe('wxpay');
  });

  it('ERRAND: 走 errand_timeline 路径', async () => {
    const svc = await build({
      errand: fakeRepo([{ errandOrderId: O, status: 'DELIVERED' }]),
      et: fakeRepo([{ createdAt: '100', eventType: 'PAID', operator: 'system' }]),
    });
    const r = await svc.getTimeline('ERRAND', O);
    expect(r.timeline[0]?.toStatus).toBe('PAID');
  });

  it('NOT_FOUND', async () => {
    const svc = await build({});
    await expect(svc.getTimeline('FOOD', O)).rejects.toThrow(NotFoundException);
  });
});

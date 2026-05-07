import type { PointsRecord, PointsRule } from '../../database/entities';

import { PointsService } from './points.service';

interface World {
  rules: PointsRule[];
  records: PointsRecord[];
}

function buildService(w: World): PointsService {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ruleRepo: any = {
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.rules.filter((r) => {
        if (where.enabled != null && r.enabled !== where.enabled) return false;
        if (where.bizType && r.bizType !== where.bizType) return false;
        return true;
      });
    }),
  };
  const recordRepo: any = {
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.records.filter((r) => r.customerId === where.customerId);
    }),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      let rows = w.records.filter((r) => {
        if (r.customerId !== where.customerId) return false;
        if (where.bizType && r.bizType !== where.bizType) return false;
        return true;
      });
      rows = [...rows].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      return [rows.slice(opt.skip, opt.skip + opt.take), rows.length];
    }),
  };
  return new PointsService(ruleRepo, recordRepo);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

describe('PointsService', () => {
  it('overview 汇总用户积分余额/获得/消耗', async () => {
    const svc = buildService({
      rules: [],
      records: [
        { customerId: '10001', points: 100 } as PointsRecord,
        { customerId: '10001', points: -30 } as PointsRecord,
        { customerId: '10002', points: 999 } as PointsRecord,
      ],
    });

    await expect(svc.overview('10001')).resolves.toEqual({
      customerId: '10001',
      balance: 70,
      totalEarned: 100,
      totalUsed: 30,
      expiringSoon: 0,
    });
  });

  it('rules 只返回启用规则并支持 bizType 过滤', async () => {
    const svc = buildService({
      rules: [
        {
          pointsRuleId: '1',
          ruleName: '外卖完成送积分',
          bizType: 'FOOD',
          triggerEvent: 'ORDER_COMPLETED',
          points: 10,
          enabled: 1,
        } as PointsRule,
        {
          pointsRuleId: '2',
          ruleName: '跑腿完成送积分',
          bizType: 'ERRAND',
          triggerEvent: 'ORDER_COMPLETED',
          points: 12,
          enabled: 1,
        } as PointsRule,
        { pointsRuleId: '3', bizType: 'FOOD', enabled: 0 } as PointsRule,
      ],
      records: [],
    });

    const res = await svc.rules({ bizType: 'ERRAND' });
    expect(res.items).toHaveLength(1);
    expect(res.items[0]!.pointsRuleId).toBe('2');
  });

  it('records 返回当前用户分页流水', async () => {
    const svc = buildService({
      rules: [],
      records: [
        {
          pointsRecordId: '1',
          customerId: '10001',
          changeType: 'EARN',
          bizType: 'FOOD',
          bizOrderId: '510001',
          points: 10,
          balanceAfter: 10,
          remark: '订单完成',
          createdAt: '100',
        } as PointsRecord,
        {
          pointsRecordId: '2',
          customerId: '10001',
          changeType: 'USE',
          bizType: 'FOOD',
          bizOrderId: '510002',
          points: -5,
          balanceAfter: 5,
          remark: '积分抵扣',
          createdAt: '200',
        } as PointsRecord,
        { pointsRecordId: '3', customerId: '10002', bizType: 'FOOD', createdAt: '300' } as PointsRecord,
      ],
    });

    const res = await svc.records('10001', { page: 1, pageSize: 1, bizType: 'FOOD' });
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]!.pointsRecordId).toBe('2');
    expect(res.items[0]!.createdAt).toBe(200);
  });
});

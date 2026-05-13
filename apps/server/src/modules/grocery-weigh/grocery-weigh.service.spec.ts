import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product } from '../../database/entities';
import type { AdminRefundService } from '../admin-refund/admin-refund.service';

import { GroceryWeighService } from './grocery-weigh.service';

interface World {
  orders: GroceryOrder[];
  items: GroceryOrderItem[];
  products: Product[];
  refundCalls: Array<Record<string, unknown>>;
}

function inMatcher(arg: unknown): string[] {
  if (typeof arg === 'string') return [arg];
  if (arg && typeof arg === 'object' && Array.isArray((arg as { _value?: string[] })._value)) {
    return (arg as { _value: string[] })._value;
  }
  return [];
}

function buildService(w: World): { svc: GroceryWeighService; refund: AdminRefundService } {
  const orderRepo = {
    findOne: jest.fn(
      async ({ where }: { where: Partial<GroceryOrder> }) =>
        w.orders.find((o) => o.groceryOrderId === where.groceryOrderId) ?? null,
    ),
    update: jest.fn(async (criteria: Partial<GroceryOrder>, patch: Partial<GroceryOrder>) => {
      const idx = w.orders.findIndex((o) => o.groceryOrderId === criteria.groceryOrderId);
      if (idx >= 0) w.orders[idx] = { ...w.orders[idx]!, ...patch };
      return { affected: 1, raw: [] };
    }),
  } as unknown as Repository<GroceryOrder>;

  const itemRepo = {
    find: jest.fn(
      async ({
        where,
      }: {
        where:
          | { groceryOrderId: string }
          | { groceryOrderItemId: { _value?: string[] } | string; groceryOrderId: string };
      }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w2: any = where;
        if (w2.groceryOrderItemId) {
          const ids = inMatcher(w2.groceryOrderItemId);
          return w.items.filter((it) => ids.includes(it.groceryOrderItemId) && it.groceryOrderId === w2.groceryOrderId);
        }
        return w.items.filter((it) => it.groceryOrderId === w2.groceryOrderId);
      },
    ),
  } as unknown as Repository<GroceryOrderItem>;

  const productRepo = {
    find: jest.fn(async ({ where }: { where: { productId: { _value?: string[] } | string } }) => {
      const ids = inMatcher(where.productId);
      return w.products.filter((p) => ids.includes(p.productId));
    }),
  } as unknown as Repository<Product>;

  const pointRepo = {} as unknown as Repository<PickupPoint>;
  const slotRepo = {} as unknown as Repository<PickupTimeSlot>;

  // EntityManager 内 update item
  const fakeEm: Partial<EntityManager> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name: string = entity?.name ?? '';
      if (name === 'GroceryOrderItem') {
        return {
          update: jest.fn(async (criteria: Partial<GroceryOrderItem>, patch: Partial<GroceryOrderItem>) => {
            const idx = w.items.findIndex((it) => it.groceryOrderItemId === criteria.groceryOrderItemId);
            if (idx >= 0) w.items[idx] = { ...w.items[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      return {};
    }),
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(fakeEm as EntityManager)),
  } as unknown as DataSource;

  const refundService = {
    createFromArbitration: jest.fn(async (input: Record<string, unknown>) => {
      w.refundCalls.push(input);
      return { refundOrderId: 'R1' } as unknown;
    }),
  } as unknown as AdminRefundService;

  const svc = new GroceryWeighService(orderRepo, itemRepo, pointRepo, slotRepo, productRepo, dataSource, refundService);
  return { svc, refund: refundService };
}

function makeWorld(): World {
  return {
    orders: [],
    items: [],
    products: [
      {
        productId: 'P1',
        pricingMode: 'weighed',
        minWeightG: 200,
        unitPricePerJin: '4000',
      } as unknown as Product,
      {
        productId: 'P2',
        pricingMode: 'fixed',
        minWeightG: null,
      } as unknown as Product,
    ],
    refundCalls: [],
  };
}

function seedSettlingOrder(w: World): void {
  w.orders.push({
    groceryOrderId: 'GO1',
    merchantId: 'M1',
    pickupSlotId: 'SL1',
    status: 'SETTLING',
    discountAmount: '0',
    estimatedGoodsAmount: '10000',
    estimatedPayableAmount: '10000',
    finalGoodsAmount: null,
    finalPayableAmount: null,
    diffAmount: null,
  } as unknown as GroceryOrder);
  w.items.push({
    groceryOrderItemId: 'IT1',
    groceryOrderId: 'GO1',
    productId: 'P1',
    productName: '猪肉',
    pricingMode: 'weighed',
    unitPrice: '4000',
    estimatedQuantity: 1000,
    estimatedSubtotal: '8000',
    actualQuantity: null,
    actualSubtotal: null,
  } as unknown as GroceryOrderItem);
  w.items.push({
    groceryOrderItemId: 'IT2',
    groceryOrderId: 'GO1',
    productId: 'P2',
    productName: '苹果',
    pricingMode: 'fixed',
    unitPrice: '1000',
    estimatedQuantity: 2,
    estimatedSubtotal: '2000',
    actualQuantity: null,
    actualSubtotal: null,
  } as unknown as GroceryOrderItem);
}

// =================== Tests ===================

describe('GroceryWeighService.weighItems', () => {
  let svc: GroceryWeighService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    seedSettlingOrder(w);
    svc = buildService(w).svc;
  });

  it('成功:写 actual_quantity + actual_subtotal(unit*g/500)', async () => {
    const r = await svc.weighItems('M1', 'OP1', {
      groceryOrderId: 'GO1',
      items: [{ groceryOrderItemId: 'IT1', actualG: 1000 }],
    });
    expect(r.items[0]!.actualQuantity).toBe(1000);
    expect(r.items[0]!.actualSubtotal).toBe('8000'); // 4000*1000/500
    // 全订单 final = 称重项 8000 + 定价项 2000 = 10000
    expect(r.finalGoodsAmount).toBe('10000');
    expect(r.finalPayableAmount).toBe('10000');
    expect(r.diffAmount).toBe('0');
    const it = w.items.find((x) => x.groceryOrderItemId === 'IT1')!;
    expect(it.actualQuantity).toBe(1000);
    expect(it.actualSubtotal).toBe('8000');
    expect(it.weighedBy).toBe('OP1');
  });

  it('订单不属于商家 → 403 Forbidden', async () => {
    await expect(
      svc.weighItems('OTHER', 'OP1', {
        groceryOrderId: 'GO1',
        items: [{ groceryOrderItemId: 'IT1', actualG: 1000 }],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('订单不存在 → NotFound', async () => {
    await expect(
      svc.weighItems('M1', 'OP1', {
        groceryOrderId: 'NO_ORDER',
        items: [{ groceryOrderItemId: 'IT1', actualG: 1000 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('订单非 SETTLING → NOT_IN_SETTLING', async () => {
    w.orders[0]!.status = 'PAID_WAIT_PICKUP';
    await expect(
      svc.weighItems('M1', 'OP1', {
        groceryOrderId: 'GO1',
        items: [{ groceryOrderItemId: 'IT1', actualG: 1000 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('定价项不能称重 → NOT_WEIGHED_ITEM', async () => {
    await expect(
      svc.weighItems('M1', 'OP1', {
        groceryOrderId: 'GO1',
        items: [{ groceryOrderItemId: 'IT2', actualG: 1000 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('低于 minWeightG → BELOW_MIN_WEIGHT', async () => {
    await expect(
      svc.weighItems('M1', 'OP1', {
        groceryOrderId: 'GO1',
        items: [{ groceryOrderItemId: 'IT1', actualG: 100 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('GroceryWeighService.confirmSettle', () => {
  let svc: GroceryWeighService;
  let refund: AdminRefundService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    seedSettlingOrder(w);
    const built = buildService(w);
    svc = built.svc;
    refund = built.refund;
    // 默认把称重项标为已称
    w.items[0]!.actualQuantity = 1000;
    w.items[0]!.actualSubtotal = '8000';
  });

  it('diff=0 → AUTO_DONE + PICKED_UP', async () => {
    w.orders[0]!.finalGoodsAmount = '10000';
    w.orders[0]!.finalPayableAmount = '10000';
    const r = await svc.confirmSettle('M1', { groceryOrderId: 'GO1' });
    expect(r.action).toBe('AUTO_DONE');
    expect(r.status).toBe('PICKED_UP');
    expect(w.orders[0]!.status).toBe('PICKED_UP');
    expect(refund.createFromArbitration).not.toHaveBeenCalled();
  });

  it('5% 浮动(差额 < 10%) → AUTO_DONE 不触发退款', async () => {
    // est 10000, final 10500, 差 +500 (5%)
    w.orders[0]!.finalGoodsAmount = '10500';
    w.orders[0]!.finalPayableAmount = '10500';
    const r = await svc.confirmSettle('M1', { groceryOrderId: 'GO1' });
    expect(r.action).toBe('AUTO_DONE');
    expect(refund.createFromArbitration).not.toHaveBeenCalled();
  });

  it('差额为负且 < 10% → AUTO_REFUND + PICKED_UP', async () => {
    // est 10000, final 9500, 差 -500 (5%) → 自动退
    w.orders[0]!.finalGoodsAmount = '9500';
    w.orders[0]!.finalPayableAmount = '9500';
    const r = await svc.confirmSettle('M1', { groceryOrderId: 'GO1' });
    expect(r.action).toBe('AUTO_REFUND');
    expect(r.status).toBe('PICKED_UP');
    expect(refund.createFromArbitration).toHaveBeenCalledTimes(1);
    expect(refund.createFromArbitration).toHaveBeenCalledWith(
      expect.objectContaining({ bizType: 'GROCERY', bizOrderId: 'GO1', amount: '500' }),
    );
  });

  it('差额为负且 > 10% → 仍 AUTO_REFUND', async () => {
    w.orders[0]!.finalGoodsAmount = '5000';
    w.orders[0]!.finalPayableAmount = '5000';
    const r = await svc.confirmSettle('M1', { groceryOrderId: 'GO1' });
    expect(r.action).toBe('AUTO_REFUND');
    expect(refund.createFromArbitration).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '5000', bizType: 'GROCERY' }),
    );
  });

  it('差额正 > 10% → NEEDS_DIFF_PAY + DIFF_PAYING', async () => {
    // est 10000, final 12000, 差 +2000 (20%)
    w.orders[0]!.finalGoodsAmount = '12000';
    w.orders[0]!.finalPayableAmount = '12000';
    const r = await svc.confirmSettle('M1', { groceryOrderId: 'GO1' });
    expect(r.action).toBe('NEEDS_DIFF_PAY');
    expect(r.status).toBe('DIFF_PAYING');
    expect(w.orders[0]!.status).toBe('DIFF_PAYING');
    expect(w.orders[0]!.diffPayStatus).toBe('unpaid');
    expect(refund.createFromArbitration).not.toHaveBeenCalled();
  });

  it('有未称重项 → WEIGH_INCOMPLETE', async () => {
    // 把 IT1 的称重数据清掉
    w.items[0]!.actualQuantity = null;
    w.items[0]!.actualSubtotal = null;
    await expect(svc.confirmSettle('M1', { groceryOrderId: 'GO1' })).rejects.toThrow(UnprocessableEntityException);
  });

  it('订单非 SETTLING → NOT_IN_SETTLING', async () => {
    w.orders[0]!.status = 'PAID_WAIT_PICKUP';
    await expect(svc.confirmSettle('M1', { groceryOrderId: 'GO1' })).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('GroceryWeighService.finalize', () => {
  let svc: GroceryWeighService;
  let w: World;
  beforeEach(() => {
    w = makeWorld();
    svc = buildService(w).svc;
    w.orders.push({
      groceryOrderId: 'GO1',
      merchantId: 'M1',
      status: 'DIFF_PAYING',
      diffPayStatus: 'paid',
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO2',
      merchantId: 'M1',
      status: 'DIFF_PAYING',
      diffPayStatus: 'unpaid',
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO3',
      merchantId: 'M1',
      status: 'PAID_WAIT_PICKUP',
      diffPayStatus: null,
    } as unknown as GroceryOrder);
    w.orders.push({
      groceryOrderId: 'GO_DONE',
      merchantId: 'M1',
      status: 'PICKED_UP',
      diffPayStatus: 'paid',
    } as unknown as GroceryOrder);
  });

  it('DIFF_PAYING + paid → PICKED_UP', async () => {
    const r = await svc.finalize('M1', { groceryOrderId: 'GO1' });
    expect(r.status).toBe('PICKED_UP');
    expect(w.orders.find((o) => o.groceryOrderId === 'GO1')!.status).toBe('PICKED_UP');
  });

  it('DIFF_PAYING + 未付 → DIFF_NOT_PAID(422)', async () => {
    await expect(svc.finalize('M1', { groceryOrderId: 'GO2' })).rejects.toThrow(UnprocessableEntityException);
  });

  it('非 DIFF_PAYING → NOT_DIFF_PAYING(422)', async () => {
    await expect(svc.finalize('M1', { groceryOrderId: 'GO3' })).rejects.toThrow(UnprocessableEntityException);
  });

  it('已是 PICKED_UP → 幂等返回', async () => {
    const r = await svc.finalize('M1', { groceryOrderId: 'GO_DONE' });
    expect(r.status).toBe('PICKED_UP');
  });

  it('订单不属本商家 → Forbidden', async () => {
    await expect(svc.finalize('OTHER', { groceryOrderId: 'GO1' })).rejects.toThrow(ForbiddenException);
  });
});

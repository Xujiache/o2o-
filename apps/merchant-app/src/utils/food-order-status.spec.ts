import { describe, expect, it } from 'vitest';

import { labelOrderStatus, nextActionsForMerchant, STATUS_LABEL_FOOD_ORDER } from './food-order-status';

describe('food-order-status utils', () => {
  it('labelOrderStatus 字典覆盖', () => {
    expect(labelOrderStatus('PAID_WAIT_MERCHANT')).toBe('待接单');
    expect(labelOrderStatus('PREPARING')).toBe('备货中');
    expect(labelOrderStatus('READY_FOR_PICKUP')).toBe('已出餐');
    expect(labelOrderStatus('UNKNOWN')).toBe('UNKNOWN');
  });

  it('nextActionsForMerchant 状态机', () => {
    expect(nextActionsForMerchant('PAID_WAIT_MERCHANT')).toEqual(['accept', 'reject']);
    expect(nextActionsForMerchant('PREPARING')).toEqual(['ready']);
    expect(nextActionsForMerchant('MERCHANT_ACCEPTED')).toEqual(['ready']);
    expect(nextActionsForMerchant('READY_FOR_PICKUP')).toEqual([]);
    expect(nextActionsForMerchant('CANCELLED')).toEqual([]);
  });

  it('字典覆盖全部 14 状态', () => {
    expect(Object.keys(STATUS_LABEL_FOOD_ORDER).length).toBe(14);
  });
});

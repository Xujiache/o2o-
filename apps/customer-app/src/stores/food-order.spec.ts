import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PreviewVo, SubmitVo } from '@/api/food-orders';

import { useFoodOrderStore } from './food-order';

describe('food-order store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('setPreview 写入 + storeId', () => {
    const s = useFoodOrderStore();
    const p: PreviewVo = {
      previewId: 'p1',
      expiresAt: 0,
      goodsAmount: '0',
      deliveryFee: '0',
      discountAmount: '0',
      payableAmount: '0',
      estimatedDeliveryTime: 40,
    };
    s.setPreview(p, '20001');
    expect(s.preview?.previewId).toBe('p1');
    expect(s.storeId).toBe('20001');
  });

  it('setSubmitted + setPayChannel', () => {
    const s = useFoodOrderStore();
    const v: SubmitVo = { orderId: '700001', orderNo: 'N1', payableAmount: '5900', expireAt: 0 };
    s.setSubmitted(v);
    s.setPayChannel('alipay');
    expect(s.submitted?.orderId).toBe('700001');
    expect(s.payChannel).toBe('alipay');
  });

  it('reset 清空', () => {
    const s = useFoodOrderStore();
    s.setPayChannel('alipay');
    s.reset();
    expect(s.preview).toBeNull();
    expect(s.submitted).toBeNull();
    expect(s.storeId).toBeNull();
  });
});

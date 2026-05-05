import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/food-cart', () => ({
  upsertCartItem: vi.fn(async () => ({
    code: '0',
    data: {
      storeId: '20001',
      items: [
        {
          cartItemId: '1',
          skuId: '9011',
          productId: '901',
          name: '汉堡',
          specValue: '大份',
          unitPrice: '2800',
          quantity: 2,
          subTotal: '5600',
        },
      ],
      goodsAmount: '5600',
      deliveryFee: '300',
      discountAmount: '0',
      totalAmount: '5900',
    },
  })),
}));

import { useFoodCartStore } from './food-cart';

describe('food-cart store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('canSwitchStore 同店 / 空车 / 不同店有车', async () => {
    const s = useFoodCartStore();
    expect(s.canSwitchStore('20001')).toBe(true);
    s.setCurrentStore('20001');
    expect(s.canSwitchStore('20001')).toBe(true);
    expect(s.canSwitchStore('20002')).toBe(true); // 无 cart
    await s.upsert('20001', '9011', 2);
    expect(s.canSwitchStore('20002')).toBe(false); // 有 cart
  });

  it('upsert 成功 → cart + currentStoreId 设置', async () => {
    const s = useFoodCartStore();
    const r = await s.upsert('20001', '9011', 2);
    expect(r?.totalAmount).toBe('5900');
    expect(s.currentStoreId).toBe('20001');
    expect(s.cart?.items).toHaveLength(1);
  });

  it('clear 重置', async () => {
    const s = useFoodCartStore();
    await s.upsert('20001', '9011', 2);
    s.clear();
    expect(s.cart).toBeNull();
    expect(s.currentStoreId).toBeNull();
  });
});

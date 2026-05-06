import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
const publishMock = vi.fn();
vi.mock('@/api/admin-marketing', () => ({
  listCoupons: (...a: unknown[]) => listMock(...a),
  publishCoupon: (...a: unknown[]) => publishMock(...a),
}));

import Coupons from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('marketing/coupons', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listMock.mockReset();
    publishMock.mockReset();
  });
  it('挂载即拉 listCoupons', async () => {
    listMock.mockResolvedValue({ code: '0', data: { items: [], total: 0, pageNo: 1, pageSize: 20 } });
    const wrapper = mount(Coupons);
    await flush();
    expect(listMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('优惠券管理');
  });
});

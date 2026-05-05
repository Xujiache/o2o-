import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listFoodOrdersMock = vi.fn();
const getTimelineStatsMock = vi.fn();

vi.mock('@/api/admin-food-orders', () => ({
  listFoodOrders: (...a: unknown[]) => listFoodOrdersMock(...a),
  getTimelineStats: (...a: unknown[]) => getTimelineStatsMock(...a),
  getFoodOrderDetail: vi.fn(async () => ({ code: '0', data: null })),
  AdminFoodOrderEndpoints: {
    List: '/api/v1/admin/food-orders',
    Detail: (id: string): string => `/api/v1/admin/food-orders/${id}`,
    Stats: '/api/v1/admin/food-orders/timeline-statistics',
  },
}));

import FoodOrders from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('admin-web food-orders page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listFoodOrdersMock.mockReset();
    getTimelineStatsMock.mockReset();
  });

  it('挂载即拉 list + stats', async () => {
    listFoodOrdersMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    getTimelineStatsMock.mockResolvedValue({
      code: '0',
      data: {
        waitPayOverdueCount: 1,
        merchantAcceptOverdueCount: 0,
        deliveringCount: 2,
        completedTodayCount: 5,
        cancelledTodayCount: 0,
      },
    });
    const wrapper = mount(FoodOrders);
    await flush();
    expect(listFoodOrdersMock).toHaveBeenCalledTimes(1);
    expect(getTimelineStatsMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('外卖订单');
  });

  it('返回 1 条 → 表格中显示 orderNo', async () => {
    listFoodOrdersMock.mockResolvedValue({
      code: '0',
      data: {
        pageNo: 1,
        pageSize: 20,
        total: 1,
        list: [
          {
            orderId: '700001',
            orderNo: '20260506000001',
            status: 'WAIT_PAY',
            payStatus: 'unpaid',
            customerId: '10001',
            storeId: '20001',
            cityCode: 'BJ',
            payableAmount: '5900',
            expireAt: 0,
            createdAt: 0,
          },
        ],
      },
    });
    getTimelineStatsMock.mockResolvedValue({
      code: '0',
      data: {
        waitPayOverdueCount: 0,
        merchantAcceptOverdueCount: 0,
        deliveringCount: 0,
        completedTodayCount: 0,
        cancelledTodayCount: 0,
      },
    });
    const wrapper = mount(FoodOrders);
    await flush();
    expect(wrapper.text()).toContain('20260506000001');
  });

  it('查询按钮 → 重置 pageNo 后调接口', async () => {
    listFoodOrdersMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    getTimelineStatsMock.mockResolvedValue({
      code: '0',
      data: {
        waitPayOverdueCount: 0,
        merchantAcceptOverdueCount: 0,
        deliveringCount: 0,
        completedTodayCount: 0,
        cancelledTodayCount: 0,
      },
    });
    const wrapper = mount(FoodOrders);
    await flush();
    listFoodOrdersMock.mockClear();
    const btn = wrapper.findAll('button').find((b) => b.text().includes('查询'));
    expect(btn).toBeTruthy();
    await btn!.trigger('click');
    await flush();
    expect(listFoodOrdersMock).toHaveBeenCalledTimes(1);
  });

  it('5 张统计卡片显示 stats 字段', async () => {
    listFoodOrdersMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    getTimelineStatsMock.mockResolvedValue({
      code: '0',
      data: {
        waitPayOverdueCount: 7,
        merchantAcceptOverdueCount: 3,
        deliveringCount: 12,
        completedTodayCount: 50,
        cancelledTodayCount: 2,
      },
    });
    const wrapper = mount(FoodOrders);
    await flush();
    const text = wrapper.text();
    expect(text).toContain('7');
    expect(text).toContain('待支付超时');
    expect(text).toContain('12');
    expect(text).toContain('配送中');
  });
});

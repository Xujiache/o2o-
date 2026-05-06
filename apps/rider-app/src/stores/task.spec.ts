import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/rider-tasks', () => ({
  getTaskDetail: vi.fn(async () => ({
    code: '0',
    data: {
      taskId: 'RT1',
      dispatchTaskId: 'D1',
      bizType: 'FOOD',
      bizOrderId: '510001',
      bizTaskId: null,
      status: 'ASSIGNED',
      acceptedAt: 1,
      arrivedPickupAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      etaAt: null,
    },
  })),
  acceptTask: vi.fn(async () => ({
    code: '0',
    data: { taskId: 'RT1', orderId: '510001', bizType: 'FOOD', taskStatus: 'ASSIGNED' },
  })),
  arrivePickup: vi.fn(async () => ({ code: '0', data: { taskId: 'RT1', status: 'ARRIVED_PICKUP', arrivedAt: 100 } })),
  pickupTask: vi.fn(async () => ({ code: '0', data: { taskId: 'RT1', status: 'PICKED_UP', pickedUpAt: 200 } })),
  deliveredTask: vi.fn(async () => ({ code: '0', data: { taskId: 'RT1', status: 'DELIVERED', deliveredAt: 300 } })),
  reportException: vi.fn(async () => ({
    code: '0',
    data: { exceptionId: 'V1', status: 'PENDING_PLATFORM', platformHandleRequired: true },
  })),
}));

import { useTaskStore } from './task';

describe('useTaskStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('load 加载 task detail', async () => {
    const s = useTaskStore();
    await s.load('RT1');
    expect(s.current?.taskId).toBe('RT1');
  });

  it('arrivePickup 后状态推进', async () => {
    const s = useTaskStore();
    await s.load('RT1');
    const ok = await s.arrivePickup('RT1', 1, 2);
    expect(ok).toBe(true);
    expect(s.current?.status).toBe('ARRIVED_PICKUP');
  });

  it('pickup 后状态推进', async () => {
    const s = useTaskStore();
    await s.load('RT1');
    const ok = await s.pickup('RT1', { pickupCode: 'A' });
    expect(ok).toBe(true);
    expect(s.current?.status).toBe('PICKED_UP');
  });

  it('delivered 后状态推进', async () => {
    const s = useTaskStore();
    await s.load('RT1');
    const ok = await s.delivered('RT1', { lng: 1, lat: 2 });
    expect(ok).toBe(true);
    expect(s.current?.status).toBe('DELIVERED');
  });

  it('reportException 后状态 EXCEPTION', async () => {
    const s = useTaskStore();
    await s.load('RT1');
    const ok = await s.reportException('RT1', { exceptionType: 'EXCEPTION', description: 'x', lng: 1, lat: 2 });
    expect(ok).toBe(true);
    expect(s.current?.status).toBe('EXCEPTION');
  });

  it('accept', async () => {
    const s = useTaskStore();
    expect(await s.accept('D1')).toBe(true);
  });
});

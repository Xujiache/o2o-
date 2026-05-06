import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data, params: opts.params },
  })),
}));

import { acceptTask, arrivePickup, deliveredTask, getTaskDetail, pickupTask, reportException } from './rider-tasks';

describe('rider-tasks api', () => {
  it('getTaskDetail GET /r/tasks/{id}', async () => {
    const r = await getTaskDetail('RT1');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/RT1');
  });

  it('acceptTask POST /accept', async () => {
    const r = await acceptTask('D1', { lng: 1, lat: 2 });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/D1/accept');
    expect((r.data as unknown as { method: string }).method).toBe('POST');
  });

  it('arrivePickup POST /arrive-pickup', async () => {
    const r = await arrivePickup('RT1', { lng: 1, lat: 2 });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/RT1/arrive-pickup');
  });

  it('pickupTask POST /pickup', async () => {
    const r = await pickupTask('RT1', { pickupCode: 'A1' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/RT1/pickup');
    expect((r.data as unknown as { body: { pickupCode: string } }).body.pickupCode).toBe('A1');
  });

  it('deliveredTask POST /delivered', async () => {
    const r = await deliveredTask('RT1', { lng: 1, lat: 2, deliveryProof: 'p1' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/RT1/delivered');
  });

  it('reportException POST /exception', async () => {
    const r = await reportException('RT1', { exceptionType: 'EXCEPTION', description: 'x', lng: 1, lat: 2 });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/tasks/RT1/exception');
  });
});

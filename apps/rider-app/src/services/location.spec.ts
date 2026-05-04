/** rider-app smoke test:验证 4 个预留 service 暴露 interface 且 mock 可调用 */
import { describe, expect, it } from 'vitest';

import { keepaliveService } from './keepalive';
import { locationService } from './location';
import { pushService } from './push';
import { traceUploadService } from './trace-upload';

describe('rider-app/services smoke', () => {
  it('locationService 单点定位返回 mock 坐标', async () => {
    const granted = await locationService.requestForegroundPermission();
    expect(granted).toBe(true);
    const point = await locationService.getOnce();
    expect(point.latitude).toBeCloseTo(39.9042);
    expect(point.longitude).toBeCloseTo(116.4074);
  });

  it('traceUploadService 入队 + flush 闭环', async () => {
    const point = await locationService.getOnce();
    traceUploadService.enqueue(point);
    const flushed = await traceUploadService.flush();
    expect(flushed).toBeGreaterThanOrEqual(1);
    const stats = traceUploadService.getStats();
    expect(stats.uploaded).toBeGreaterThanOrEqual(1);
  });

  it('pushService init + getClientId', async () => {
    await pushService.init();
    const cid = await pushService.getClientId();
    expect(cid).toMatch(/^mock-cid-/);
  });

  it('keepaliveService start/stop 状态切换', async () => {
    expect(keepaliveService.isActive()).toBe(false);
    await keepaliveService.start();
    expect(keepaliveService.isActive()).toBe(true);
    await keepaliveService.stop();
    expect(keepaliveService.isActive()).toBe(false);
  });
});

import { EventName, type EventPayloadMap } from './events';

describe('Stage 3 EventName 扩展', () => {
  it('5 个 stage 3 事件全部以 domain.rider. 前缀', () => {
    const stage3 = [
      EventName.RiderSubmitted,
      EventName.RiderApproved,
      EventName.RiderOnline,
      EventName.RiderOffline,
      EventName.RiderLocationUpdated,
    ];
    expect(stage3).toEqual([
      'domain.rider.submitted',
      'domain.rider.approved',
      'domain.rider.online',
      'domain.rider.offline',
      'domain.rider.location-updated',
    ]);
    for (const e of stage3) expect(e.startsWith('domain.rider.')).toBe(true);
  });

  it('EventPayloadMap 5 个 key 编译期对齐(类型层面冒烟)', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.RiderSubmitted
      | typeof EventName.RiderApproved
      | typeof EventName.RiderOnline
      | typeof EventName.RiderOffline
      | typeof EventName.RiderLocationUpdated
    > = {
      [EventName.RiderSubmitted]: { applicationId: '1', riderId: '1', mobile: '139', submittedAt: 0 },
      [EventName.RiderApproved]: { applicationId: '1', riderId: '1', approvedAt: 0, auditedBy: 'admin-1' },
      [EventName.RiderOnline]: { riderId: '1' },
      [EventName.RiderOffline]: { riderId: '1', reason: 'rider-action' },
      [EventName.RiderLocationUpdated]: {
        riderId: '1',
        batchId: 'b1',
        batchSize: 1,
        lastLng: 116,
        lastLat: 39,
        lastReportedAt: 0,
      },
    };
    expect(Object.keys(sample)).toHaveLength(5);
  });

  it('Object.values(EventName) 共 33 个(stage 0 五 + stage 1 五 + stage 2 六 + stage 3 五 + stage 4 六 + stage 5 六)', () => {
    expect(Object.values(EventName)).toHaveLength(33);
  });
});

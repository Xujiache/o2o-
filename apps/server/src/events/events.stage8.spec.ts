import { EventName, type EventPayloadMap } from './events';

describe('Stage 8 EventName 扩展', () => {
  it('7 个 stage 8 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage8 = [
      EventName.DispatchStarted,
      EventName.RiderTaskAccepted,
      EventName.RiderArrivedPickup,
      EventName.RiderPickedUp,
      EventName.RiderDelivered,
      EventName.RiderExceptionReported,
      EventName.RiderEarningGenerated,
    ];
    expect(stage8).toEqual([
      'domain.dispatch.started',
      'domain.rider-task.accepted',
      'domain.rider-task.arrived-pickup',
      'domain.rider-task.picked-up',
      'domain.rider-task.delivered',
      'domain.rider-task.exception-reported',
      'domain.rider-earning.generated',
    ]);
    for (const e of stage8) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 7 个 key 编译期对齐', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.DispatchStarted
      | typeof EventName.RiderTaskAccepted
      | typeof EventName.RiderArrivedPickup
      | typeof EventName.RiderPickedUp
      | typeof EventName.RiderDelivered
      | typeof EventName.RiderExceptionReported
      | typeof EventName.RiderEarningGenerated
    > = {
      [EventName.DispatchStarted]: {
        dispatchTaskId: 'D1',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        candidateRiderIds: ['30001', '30002'],
        dispatchedAt: 1716077400000,
      },
      [EventName.RiderTaskAccepted]: {
        riderTaskId: 'RT1',
        dispatchTaskId: 'D1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        acceptedAt: 1716077500000,
      },
      [EventName.RiderArrivedPickup]: {
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        lng: 116.4,
        lat: 39.9,
        arrivedAt: 1716077800000,
      },
      [EventName.RiderPickedUp]: {
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        pickedUpAt: 1716077900000,
      },
      [EventName.RiderDelivered]: {
        riderTaskId: 'RT1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        deliveryProof: 'photo:9001',
        deliveredAt: 1716079000000,
      },
      [EventName.RiderExceptionReported]: {
        riderViolationId: 'V1',
        riderTaskId: 'RT1',
        riderId: '30001',
        exceptionType: 'EXCEPTION',
        description: '客户拒收',
        platformHandleRequired: true,
        reportedAt: 1716078500000,
      },
      [EventName.RiderEarningGenerated]: {
        riderEarningId: 'E1',
        riderId: '30001',
        settleDate: 20260505,
        totalAmount: '15000',
        generatedAt: 1716163800000,
      },
    };
    expect(Object.keys(sample)).toHaveLength(7);
  });

  it('Object.values(EventName) 总计 55(stage 7 末 48 + stage 8 +7)', () => {
    expect(Object.values(EventName)).toHaveLength(55);
  });
});

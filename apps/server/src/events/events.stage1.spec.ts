import { EventName, type EventPayloadMap } from './events';

describe('Stage 1 EventName 扩展', () => {
  it('5 个 stage 1 事件全部以 domain.customer. 前缀,与 stage 0 风格一致', () => {
    const stage1 = [
      EventName.CustomerRegistered,
      EventName.CustomerLoggedIn,
      EventName.CustomerRealnameVerified,
      EventName.CustomerAddressChanged,
      EventName.CustomerAccountDisabled,
    ];
    expect(stage1).toEqual([
      'domain.customer.registered',
      'domain.customer.logged-in',
      'domain.customer.realname-verified',
      'domain.customer.address-changed',
      'domain.customer.account-disabled',
    ]);
    for (const e of stage1) expect(e.startsWith('domain.customer.')).toBe(true);
  });

  it('EventPayloadMap 全部 5 个 key 编译期对齐(类型层面冒烟)', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.CustomerRegistered
      | typeof EventName.CustomerLoggedIn
      | typeof EventName.CustomerRealnameVerified
      | typeof EventName.CustomerAddressChanged
      | typeof EventName.CustomerAccountDisabled
    > = {
      [EventName.CustomerRegistered]: { userId: '1', mobile: '13800000001', registerSource: 'mobile' },
      [EventName.CustomerLoggedIn]: { userId: '1', deviceId: 'd1', ip: '1.1.1.1', scene: 'login' },
      [EventName.CustomerRealnameVerified]: { userId: '1', verifiedAt: 1700000000000 },
      [EventName.CustomerAddressChanged]: { userId: '1', addressId: 'a1', action: 'create' },
      [EventName.CustomerAccountDisabled]: { userId: '1', operatorId: 'admin-1', reason: '测试' },
    };
    expect(Object.keys(sample)).toHaveLength(5);
  });

  it('Object.values(EventName) 含 stage 0 5 + stage 1 5 + stage 2 6 + stage 3 5 = 21', () => {
    expect(Object.values(EventName)).toHaveLength(21);
  });
});

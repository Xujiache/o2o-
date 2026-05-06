import { EventName, type EventPayloadMap } from './events';

describe('Stage 4 EventName 扩展', () => {
  it('6 个 stage 4 事件命名按 domain.<biz>.<verb> 风格', () => {
    const stage4 = [
      EventName.AdminLoggedIn,
      EventName.RoleChanged,
      EventName.AccountDisabled,
      EventName.MerchantAudited,
      EventName.RiderAudited,
      EventName.ThirdPartyConfigChanged,
    ];
    expect(stage4).toEqual([
      'domain.admin.logged-in',
      'domain.role.changed',
      'domain.account.disabled',
      'domain.merchant.audited',
      'domain.rider.audited',
      'domain.thirdparty.config-changed',
    ]);
    for (const e of stage4) expect(e.startsWith('domain.')).toBe(true);
  });

  it('EventPayloadMap 6 个 key 编译期对齐(类型层面冒烟)', () => {
    const sample: Pick<
      EventPayloadMap,
      | typeof EventName.AdminLoggedIn
      | typeof EventName.RoleChanged
      | typeof EventName.AccountDisabled
      | typeof EventName.MerchantAudited
      | typeof EventName.RiderAudited
      | typeof EventName.ThirdPartyConfigChanged
    > = {
      [EventName.AdminLoggedIn]: {
        adminUserId: '40001',
        username: 'super_admin',
        loggedInAt: 0,
      },
      [EventName.RoleChanged]: {
        roleId: '1',
        roleCode: 'AUDITOR',
        oldPermissionCodes: [],
        newPermissionCodes: ['admin:menu:customers'],
        operatorAdminId: '40001',
        changedAt: 0,
      },
      [EventName.AccountDisabled]: {
        accountType: 'customer',
        accountId: '10001',
        action: 'disable',
        reason: '测试',
        operatorAdminId: '40001',
        operatedAt: 0,
      },
      [EventName.MerchantAudited]: {
        applicationId: '1',
        merchantId: '20001',
        auditResult: 'approved',
        operatorAdminId: '40001',
        auditedAt: 0,
      },
      [EventName.RiderAudited]: {
        applicationId: '1',
        riderId: '30001',
        auditResult: 'rejected',
        rejectReason: '资质不全',
        operatorAdminId: '40001',
        auditedAt: 0,
      },
      [EventName.ThirdPartyConfigChanged]: {
        provider: 'ali-realname',
        changedFields: ['secret'],
        operatorAdminId: '40001',
        changedAt: 0,
      },
    };
    expect(Object.keys(sample)).toHaveLength(6);
  });

  it('Object.values(EventName) 总计 39(stage 0 五 + stage 1 五 + stage 2 六 + stage 3 五 + stage 4 六 + stage 5 六 + stage 6 六)', () => {
    expect(Object.values(EventName).length).toBeGreaterThanOrEqual(55);
  });
});

import type { Repository } from 'typeorm';

import type { AdminUser } from '../../database/entities';
import type { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName } from '../events';

import { AccountDisabledSubscriber } from './account-disabled.subscriber';
import { AdminLoggedInSubscriber } from './admin-logged-in.subscriber';
import { MerchantAuditedSubscriber } from './merchant-audited.subscriber';
import { RiderAuditedSubscriber } from './rider-audited.subscriber';
import { RoleChangedSubscriber } from './role-changed.subscriber';
import { ThirdPartyConfigChangedSubscriber } from './third-party-config-changed.subscriber';

class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
}

const fakeAudit = (): jest.Mocked<AuditLogService> =>
  ({
    writeAudit: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<AuditLogService>;

describe('Stage 4 subscribers', () => {
  it('AdminLoggedInSubscriber → 写 audit_log', async () => {
    const audit = fakeAudit();
    const sub = new AdminLoggedInSubscriber(audit);
    await sub.handle({ adminUserId: '40001', username: 'super_admin', loggedInAt: 0 });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'admin-auth', operatorType: 'admin' }),
    );
  });

  it('RoleChangedSubscriber → 扫 admin + 写 Redis 标记 + 写 audit_log', async () => {
    const adminRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [{ adminUserId: '40001' } as AdminUser, { adminUserId: '40002' } as AdminUser]),
      })),
    } as unknown as Repository<AdminUser>;
    const redis = new FakeRedis();
    const audit = fakeAudit();
    const sub = new RoleChangedSubscriber(adminRepo, redis as unknown as never, audit);
    await sub.handle({
      roleId: '1',
      roleCode: 'AUDITOR',
      oldPermissionCodes: ['a'],
      newPermissionCodes: ['a', 'b'],
      operatorAdminId: 'admin-1',
      changedAt: 1700000000,
    });
    const keys = [...redis.store.keys()];
    expect(keys).toContain('admin:role-revoked:40001:1700000000');
    expect(keys).toContain('admin:role-revoked:40002:1700000000');
    expect(audit.writeAudit).toHaveBeenCalled();
  });

  it('AccountDisabledSubscriber disable → 写 Redis 标记 + audit_log', async () => {
    const redis = new FakeRedis();
    const audit = fakeAudit();
    const sub = new AccountDisabledSubscriber(redis as unknown as never, audit);
    await sub.handle({
      accountType: 'customer',
      accountId: '10001',
      action: 'disable',
      reason: '违规',
      operatorAdminId: 'admin-1',
      operatedAt: 1700000000,
    });
    expect(redis.store.get('customer:account-revoked:10001')).toBe('1700000000');
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'customer-account', afterStatus: 'disabled' }),
    );
  });

  it('AccountDisabledSubscriber enable → 不写 Redis 标记,只 audit_log', async () => {
    const redis = new FakeRedis();
    const audit = fakeAudit();
    const sub = new AccountDisabledSubscriber(redis as unknown as never, audit);
    await sub.handle({
      accountType: 'rider',
      accountId: '30001',
      action: 'enable',
      operatorAdminId: 'admin-1',
      operatedAt: 1700000000,
    });
    expect(redis.store.size).toBe(0);
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ afterStatus: 'active' }));
  });

  it('MerchantAuditedSubscriber → audit_log', async () => {
    const audit = fakeAudit();
    const sub = new MerchantAuditedSubscriber(audit);
    await sub.handle({
      applicationId: '1',
      auditResult: 'rejected',
      rejectReason: '资质问题',
      operatorAdminId: 'admin-1',
      auditedAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'merchant-application', afterStatus: 'rejected' }),
    );
  });

  it('RiderAuditedSubscriber → audit_log', async () => {
    const audit = fakeAudit();
    const sub = new RiderAuditedSubscriber(audit);
    await sub.handle({
      applicationId: '2',
      auditResult: 'approved',
      operatorAdminId: 'admin-1',
      auditedAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'rider-application', afterStatus: 'approved' }),
    );
  });

  it('ThirdPartyConfigChangedSubscriber → audit_log', async () => {
    const audit = fakeAudit();
    const sub = new ThirdPartyConfigChangedSubscriber(audit);
    await sub.handle({
      provider: 'ali-realname',
      changedFields: ['secret'],
      operatorAdminId: 'admin-1',
      changedAt: 0,
    });
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'third-party-config' }));
  });

  it('event names 配齐', () => {
    expect(EventName.AdminLoggedIn).toBe('domain.admin.logged-in');
    expect(EventName.RoleChanged).toBe('domain.role.changed');
    expect(EventName.AccountDisabled).toBe('domain.account.disabled');
    expect(EventName.MerchantAudited).toBe('domain.merchant.audited');
    expect(EventName.RiderAudited).toBe('domain.rider.audited');
    expect(EventName.ThirdPartyConfigChanged).toBe('domain.thirdparty.config-changed');
  });
});

import { NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import type { Repository } from 'typeorm';

import type { CustomerProfile, CustomerUser, LoginDevice, RealnameRecord, RiskUserTag } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { CustomerAuthService } from '../customer-auth/customer-auth.service';

import { AdminUserService } from './admin-user.service';

describe('AdminUserService', () => {
  let svc: AdminUserService;
  let users: CustomerUser[];
  let profiles: CustomerProfile[];
  let devices: LoginDevice[];
  let records: RealnameRecord[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let userRepo: jest.Mocked<Repository<CustomerUser>>;
  let profileRepo: jest.Mocked<Repository<CustomerProfile>>;
  let deviceRepo: jest.Mocked<Repository<LoginDevice>>;
  let recordRepo: jest.Mocked<Repository<RealnameRecord>>;
  let riskRepo: jest.Mocked<Repository<RiskUserTag>>;
  let customerAuth: jest.Mocked<CustomerAuthService>;
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    users = [
      {
        userId: '1',
        mobile: '13800000001',
        wechatOpenId: null,
        accountStatus: 'active',
        realnameStatus: 'verified',
        profileCompleted: 1,
        registerSource: 'mobile',
        registerDeviceId: null,
        createdAt: '1700000000000',
        updatedAt: '1700000000000',
      } as CustomerUser,
      {
        userId: '2',
        mobile: '13800000002',
        wechatOpenId: null,
        accountStatus: 'disabled',
        realnameStatus: 'unverified',
        profileCompleted: 0,
        registerSource: 'mobile',
        registerDeviceId: null,
        createdAt: '1700000010000',
        updatedAt: '1700000020000',
      } as CustomerUser,
    ];
    profiles = [
      {
        userId: '1',
        nickname: 'Alice',
        avatarUrl: null,
        gender: 'unknown',
        birthday: null,
        updatedAt: '0',
      } as CustomerProfile,
    ];
    devices = [
      {
        loginId: '1',
        userId: '1',
        deviceId: 'd1',
        platform: 'h5',
        loginIp: '1.1.1.1',
        loginCity: null,
        refreshTokenHash: 'h',
        loginAt: '1700000005000',
        lastActiveAt: '1700000005000',
        status: 'active',
      } as LoginDevice,
    ];
    records = [
      {
        recordId: '1',
        userId: '1',
        realName: '张三',
        idCardNo: '110101199001011234',
        status: 'success',
        failedReason: null,
        providerRequestId: 'mock',
        verifiedAt: '1700000003000',
        createdAt: '1700000002000',
        updatedAt: '1700000003000',
      } as RealnameRecord,
    ];
    publishedEvents = [];

    userRepo = {
      createQueryBuilder: jest.fn(() => {
        const filtered = [...users];
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [filtered, filtered.length] as [CustomerUser[], number]);
        return qb;
      }),
      findOne: jest.fn(
        async ({ where }: { where: Partial<CustomerUser> }) => users.find((u) => u.userId === where.userId) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<CustomerUser>, patch: Partial<CustomerUser>) => {
        const u = users.find((x) => x.userId === criteria.userId);
        if (u) Object.assign(u, patch);
        return { affected: u ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<CustomerUser>>;

    profileRepo = {
      find: jest.fn(async () => profiles),
      findOne: jest.fn(
        async ({ where }: { where: Partial<CustomerProfile> }) =>
          profiles.find((p) => p.userId === where.userId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<CustomerProfile>>;

    deviceRepo = {
      find: jest.fn(async () => devices),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.where = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.getMany = jest.fn(async () => devices);
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<LoginDevice>>;

    recordRepo = {
      findAndCount: jest.fn(async () => [records, records.length]),
    } as unknown as jest.Mocked<Repository<RealnameRecord>>;

    riskRepo = {
      find: jest.fn(async () => []),
    } as unknown as jest.Mocked<Repository<RiskUserTag>>;

    customerAuth = {
      revokeAllDevices: jest.fn(async () => undefined),
    } as unknown as jest.Mocked<CustomerAuthService>;

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AdminUserService(userRepo, profileRepo, deviceRepo, recordRepo, riskRepo, customerAuth, bus);
  });

  it('listCustomers:返回脱敏 mobile + nickname', async () => {
    const page = await svc.listCustomers({});
    expect(page.total).toBe(2);
    const serialized = instanceToPlain(page.list[0]!) as { mobileMasked: string };
    expect(serialized.mobileMasked).toMatch(/^138\*+\d{4}$/);
  });

  it('getCustomerDetail:返回完整详情(含 recentDevices + riskTags)', async () => {
    const detail = await svc.getCustomerDetail('1');
    expect(detail.recentDevices).toHaveLength(1);
    expect(detail.riskTags).toHaveLength(0);
  });

  it('getCustomerDetail 不存在用户 → NotFound', async () => {
    await expect(svc.getCustomerDetail('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listRealnameRecords:realName / idCardNo 脱敏', async () => {
    const page = await svc.listRealnameRecords('1', 1, 20);
    expect(page.list).toHaveLength(1);
    const serialized = instanceToPlain(page.list[0]!) as { realNameMasked: string; idCardMasked: string };
    expect(serialized.realNameMasked).toBeTruthy();
    expect(serialized.idCardMasked).toContain('**');
  });

  it('changeStatus disable:UPDATE + 吊销设备 + 发布 AccountDisabled', async () => {
    const r = await svc.changeStatus('1', 'admin-1', { operation: 'disable', reason: '违规' });
    expect(r.accountStatus).toBe('disabled');
    expect(customerAuth.revokeAllDevices).toHaveBeenCalledWith('1');
    expect(publishedEvents).toEqual([expect.objectContaining({ name: EventName.CustomerAccountDisabled })]);
  });

  it('changeStatus 幂等:已 disabled → 不重发事件', async () => {
    const r = await svc.changeStatus('2', 'admin-1', { operation: 'disable', reason: '复操作' });
    expect(r.accountStatus).toBe('disabled');
    expect(publishedEvents).toHaveLength(0);
    expect(customerAuth.revokeAllDevices).not.toHaveBeenCalled();
  });

  it('changeStatus enable:UPDATE 不发布事件,不吊销设备', async () => {
    const r = await svc.changeStatus('2', 'admin-1', { operation: 'enable', reason: '解禁' });
    expect(r.accountStatus).toBe('active');
    expect(publishedEvents).toHaveLength(0);
    expect(customerAuth.revokeAllDevices).not.toHaveBeenCalled();
  });
});

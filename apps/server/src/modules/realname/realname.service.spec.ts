import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { CustomerUser, IntegrationRequestLog, RealnameRecord } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import type { SmsService } from '../sms/sms.service';

import { RealnameService } from './realname.service';

describe('RealnameService', () => {
  let svc: RealnameService;
  let users: CustomerUser[];
  let records: RealnameRecord[];
  let logs: IntegrationRequestLog[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let nextRecordId = 1;

  let userRepo: jest.Mocked<Repository<CustomerUser>>;
  let recordRepo: jest.Mocked<Repository<RealnameRecord>>;
  let logRepo: jest.Mocked<Repository<IntegrationRequestLog>>;
  let sms: jest.Mocked<SmsService>;
  let gateway: { realname: { verify: jest.Mock } };
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    users = [
      {
        userId: '1',
        mobile: '13800000001',
        wechatOpenId: null,
        accountStatus: 'active',
        realnameStatus: 'unverified',
        profileCompleted: 0,
        registerSource: 'mobile',
        registerDeviceId: null,
        createdAt: '0',
        updatedAt: '0',
      } as CustomerUser,
      {
        userId: '2',
        mobile: '13800000002',
        wechatOpenId: null,
        accountStatus: 'active',
        realnameStatus: 'verified',
        profileCompleted: 1,
        registerSource: 'mobile',
        registerDeviceId: null,
        createdAt: '0',
        updatedAt: '0',
      } as CustomerUser,
    ];
    records = [];
    logs = [];
    publishedEvents = [];
    nextRecordId = 1;

    userRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<CustomerUser> }) => users.find((u) => u.userId === where.userId) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<CustomerUser>, patch: Partial<CustomerUser>) => {
        const u = users.find((x) => x.userId === criteria.userId);
        if (u) Object.assign(u, patch);
        return { affected: u ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<CustomerUser>>;

    recordRepo = {
      create: jest.fn((dto: Partial<RealnameRecord>) => dto as RealnameRecord),
      save: jest.fn(async (r: RealnameRecord) => {
        const saved = { ...r, recordId: String(nextRecordId++) };
        records.push(saved);
        return saved;
      }),
      update: jest.fn(async (criteria: Partial<RealnameRecord>, patch: Partial<RealnameRecord>) => {
        const r = records.find((x) => x.recordId === criteria.recordId);
        if (r) Object.assign(r, patch);
        return { affected: r ? 1 : 0 };
      }),
      findAndCount: jest.fn(),
    } as unknown as jest.Mocked<Repository<RealnameRecord>>;

    logRepo = {
      insert: jest.fn(async (l: Partial<IntegrationRequestLog>) => {
        logs.push(l as IntegrationRequestLog);
        return { identifiers: [{ id: '1' }] };
      }),
    } as unknown as jest.Mocked<Repository<IntegrationRequestLog>>;

    sms = {
      verifyCode: jest.fn(async () => true),
      consumeCode: jest.fn(async () => true),
    } as unknown as jest.Mocked<SmsService>;

    gateway = {
      realname: {
        verify: jest.fn(async () => ({ success: true, providerRequestId: 'mock-realname-1' })),
      },
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new RealnameService(userRepo, recordRepo, logRepo, sms, gateway as unknown as IntegrationGatewayService, bus);
  });

  it('happy:三要素一致 → success + customer_user.realname_status=verified + 发布 RealnameVerified', async () => {
    const r = await svc.submit('1', { realName: '张三', idCardNo: '110101199001011234', smsCode: '123456' });
    expect(r.verifyStatus).toBe('success');
    expect(users[0]!.realnameStatus).toBe('verified');
    expect(records[0]!.status).toBe('success');
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.CustomerRealnameVerified,
        payload: expect.objectContaining({ userId: '1' }),
      }),
    ]);
  });

  it('已 verified 用户重复提交 → STATUS_INVALID', async () => {
    await expect(
      svc.submit('2', { realName: '李四', idCardNo: '110101199001012345', smsCode: '111111' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('sms code 错误 → UNAUTHORIZED + 不写 record', async () => {
    sms.verifyCode.mockResolvedValueOnce(false);
    await expect(
      svc.submit('1', { realName: '张三', idCardNo: '110101199001011234', smsCode: '999999' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(records).toHaveLength(0);
  });

  it('第三方 failed → record status=failed,failed_reason 标准化文案,不含原文', async () => {
    gateway.realname.verify.mockResolvedValueOnce({
      success: false,
      providerRequestId: 'mock-fail-1',
      reason: '内容不符',
    });
    const r = await svc.submit('1', { realName: 'Smith', idCardNo: '110101199001011234', smsCode: '123456' });
    expect(r.verifyStatus).toBe('failed');
    expect(r.failedReason).toBe('内容不符');
    const rec = records[records.length - 1]!;
    expect(rec.status).toBe('failed');
    expect(rec.failedReason).toBe('内容不符');
    expect(rec.failedReason).not.toContain('Smith'); // 标准化文案,不暴露原始姓名
  });

  it('第三方抛错 → 落 failed reason=三方不可用', async () => {
    gateway.realname.verify.mockRejectedValueOnce(new Error('upstream timeout'));
    const r = await svc.submit('1', { realName: '张三', idCardNo: '110101199001011234', smsCode: '123456' });
    expect(r.verifyStatus).toBe('failed');
    expect(r.failedReason).toBe('三方不可用');
  });
});

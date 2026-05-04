import { LessThan, MoreThan } from 'typeorm';

import type { CustomerAddress, CustomerUser, LoginDevice, RealnameRecord, SmsCode } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import type { DistributedLockService } from '../distributed-lock.service';

import { DefaultAddressUniquenessJob } from './default-address-uniqueness.job';
import { LoginAnomalyDetectionJob } from './login-anomaly-detection.job';
import { RealnameRetryJob } from './realname-retry.job';
import { SmsCodeExpiredCleanupJob } from './sms-code-expired-cleanup.job';

class MockLock {
  private held = false;
  async acquire(): Promise<string | null> {
    if (this.held) return null;
    this.held = true;
    return 'tok';
  }
  async release(): Promise<void> {
    this.held = false;
  }
}

describe('SmsCodeExpiredCleanupJob', () => {
  it('删除 expire_at < cutoff 的记录', async () => {
    const repo = { delete: jest.fn().mockResolvedValue({ affected: 7 }) };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new SmsCodeExpiredCleanupJob(repo as never, lock);
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(r.error).toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith({ expireAt: LessThan(expect.any(String)) });
  });

  it('两实例并发只一个跑', async () => {
    const repo = { delete: jest.fn().mockResolvedValue({ affected: 0 }) };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new SmsCodeExpiredCleanupJob(repo as never, lock);
    const b = new SmsCodeExpiredCleanupJob(repo as never, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

describe('LoginAnomalyDetectionJob', () => {
  it('同 user 多城市登录 → 告警日志', async () => {
    const fakeRows: Partial<LoginDevice>[] = [
      { userId: '1', loginCity: '北京', loginAt: String(Date.now()) },
      { userId: '1', loginCity: '上海', loginAt: String(Date.now()) },
      { userId: '2', loginCity: '北京', loginAt: String(Date.now()) },
    ];
    const repo = { find: jest.fn().mockResolvedValue(fakeRows) };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new LoginAnomalyDetectionJob(repo as never, lock);
    const warnSpy = jest.spyOn(job['logger'], 'warn');
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(repo.find).toHaveBeenCalledWith({
      where: { loginAt: MoreThan(expect.any(String)) },
      order: { loginAt: 'DESC' },
      take: 1000,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('两实例并发只一个跑', async () => {
    const repo = { find: jest.fn().mockResolvedValue([]) };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new LoginAnomalyDetectionJob(repo as never, lock);
    const b = new LoginAnomalyDetectionJob(repo as never, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

describe('RealnameRetryJob', () => {
  it('pending 超 5min → 调适配器,success 时更新表 + 发布 RealnameVerified', async () => {
    const candidate: Partial<RealnameRecord> = {
      recordId: '1',
      userId: '100',
      realName: '张三',
      idCardNo: '110101199001011234',
      status: 'pending',
      updatedAt: String(Date.now() - 10 * 60_000),
    };
    const recordRepo = {
      find: jest.fn().mockResolvedValue([candidate]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepo: { update: jest.Mock } = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const gateway = {
      realname: { verify: jest.fn().mockResolvedValue({ success: true, providerRequestId: 'mock-1' }) },
    };
    const events: Array<{ name: string }> = [];
    const bus = {
      publish: jest.fn(async (name: string) => {
        events.push({ name });
        return { eventId: 'evt' };
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new RealnameRetryJob(
      recordRepo as never,
      userRepo as never,
      gateway as unknown as IntegrationGatewayService,
      bus as unknown as DomainEventBus,
      lock,
    );
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(gateway.realname.verify).toHaveBeenCalledWith('张三', '110101199001011234');
    expect(events).toEqual([{ name: EventName.CustomerRealnameVerified }]);
  });

  it('两实例并发只一个跑', async () => {
    const recordRepo = { find: jest.fn().mockResolvedValue([]), update: jest.fn() };
    const userRepo = { update: jest.fn() };
    const gateway = { realname: { verify: jest.fn() } };
    const bus = { publish: jest.fn() };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new RealnameRetryJob(
      recordRepo as never,
      userRepo as never,
      gateway as unknown as IntegrationGatewayService,
      bus as unknown as DomainEventBus,
      lock,
    );
    const b = new RealnameRetryJob(
      recordRepo as never,
      userRepo as never,
      gateway as unknown as IntegrationGatewayService,
      bus as unknown as DomainEventBus,
      lock,
    );
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

describe('DefaultAddressUniquenessJob', () => {
  it('多默认 → 保留最新,其余清 0', async () => {
    const offenders = [{ userId: '1' }];
    const rows: Partial<CustomerAddress>[] = [
      { addressId: 'a3', userId: '1', isDefault: 1, updatedAt: '300' },
      { addressId: 'a2', userId: '1', isDefault: 1, updatedAt: '200' },
      { addressId: 'a1', userId: '1', isDefault: 1, updatedAt: '100' },
    ];
    const updateExecuteSpy = jest.fn().mockResolvedValue({ affected: 2 });
    const repo = {
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.select = jest.fn(chain);
        qb.where = jest.fn(chain);
        qb.groupBy = jest.fn(chain);
        qb.having = jest.fn(chain);
        qb.getRawMany = jest.fn(async () => offenders);
        qb.update = jest.fn(chain);
        qb.set = jest.fn(chain);
        qb.whereInIds = jest.fn(chain);
        qb.execute = updateExecuteSpy;
        return qb;
      }),
      find: jest.fn().mockResolvedValue(rows),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new DefaultAddressUniquenessJob(repo as never, lock);
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(updateExecuteSpy).toHaveBeenCalled();
  });

  it('两实例并发只一个跑', async () => {
    const repo = {
      createQueryBuilder: jest.fn(() => ({
        select: () => ({
          where: () => ({
            groupBy: () => ({ having: () => ({ getRawMany: async () => [] }) }),
          }),
        }),
      })),
      find: jest.fn(),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new DefaultAddressUniquenessJob(repo as never, lock);
    const b = new DefaultAddressUniquenessJob(repo as never, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

// 防止 unused import 编译警告
const _types: Array<CustomerUser | SmsCode | LoginDevice | RealnameRecord | CustomerAddress> = [];
void _types;

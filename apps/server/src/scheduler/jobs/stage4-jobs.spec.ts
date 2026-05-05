import type { Repository } from 'typeorm';

import type { AccountDisableRecord, SysAuditLog } from '../../database/entities';
import type { DistributedLockService } from '../distributed-lock.service';

import { ConfigChangeAggregateJob } from './config-change-aggregate.job';
import { DisabledAccountTokenBroadcastJob } from './disabled-account-token-broadcast.job';

const fakeLock = (): jest.Mocked<DistributedLockService> =>
  ({
    acquire: jest.fn(async () => true),
    release: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<DistributedLockService>;

class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
}

describe('Stage 4 jobs', () => {
  describe('ConfigChangeAggregateJob', () => {
    it('do() 无 audit_log 时 debug 不抛', async () => {
      const repo = { find: jest.fn(async () => []) } as unknown as jest.Mocked<Repository<SysAuditLog>>;
      const job = new ConfigChangeAggregateJob(repo, fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
    });

    it('do() 聚合多种 targetType', async () => {
      const repo = {
        find: jest.fn(async () => [
          { targetType: 'sys-config' },
          { targetType: 'sys-config' },
          { targetType: 'third-party-config' },
        ]),
      } as unknown as jest.Mocked<Repository<SysAuditLog>>;
      const job = new ConfigChangeAggregateJob(repo, fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('DisabledAccountTokenBroadcastJob', () => {
    it('do() 无 disable 记录 → 直接返', async () => {
      const repo = { find: jest.fn(async () => []) } as unknown as jest.Mocked<Repository<AccountDisableRecord>>;
      const redis = new FakeRedis();
      const job = new DisabledAccountTokenBroadcastJob(repo, redis as unknown as never, fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
      expect(redis.store.size).toBe(0);
    });

    it('do() 写 Redis 标记 per record', async () => {
      const repo = {
        find: jest.fn(async () => [
          { accountType: 'customer', accountId: '1', createdAt: '1700000000' },
          { accountType: 'rider', accountId: '2', createdAt: '1700000001' },
        ]),
      } as unknown as jest.Mocked<Repository<AccountDisableRecord>>;
      const redis = new FakeRedis();
      const job = new DisabledAccountTokenBroadcastJob(repo, redis as unknown as never, fakeLock());
      await job.do();
      expect(redis.store.get('customer:account-revoked:1')).toBe('1700000000');
      expect(redis.store.get('rider:account-revoked:2')).toBe('1700000001');
    });
  });
});

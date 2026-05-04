import { LessThan } from 'typeorm';

import { DistributedLockService } from '../distributed-lock.service';

import { ExpiredCleanupJob } from './expired-cleanup.job';

class MockLock {
  private held = false;
  async acquire(): Promise<string | null> {
    if (this.held) return null;
    this.held = true;
    return 'mock-token';
  }
  async release(): Promise<void> {
    this.held = false;
  }
}

describe('ExpiredCleanupJob', () => {
  it('清理过期幂等记录(expire_at < now)', async () => {
    const deleteSpy = jest.fn().mockResolvedValue({ affected: 3 });
    const repo = { delete: deleteSpy };
    const lock = new MockLock() as unknown as DistributedLockService;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = new ExpiredCleanupJob(repo as any, lock);
    const result = await job.run();

    expect(result.executed).toBe(true);
    expect(result.error).toBeUndefined();
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const [arg] = deleteSpy.mock.calls[0];
    expect(arg).toHaveProperty('expireAt');
    // LessThan 是 typeorm 的 FindOperator
    expect(arg.expireAt).toEqual(LessThan(expect.any(String)));
    const m = job.getMetrics();
    expect(m.runs).toBe(1);
    expect(m.success).toBe(1);
    expect(m.failed).toBe(0);
  });

  it('两实例并发只有一个真正执行', async () => {
    const repo = { delete: jest.fn().mockResolvedValue({ affected: 0 }) };
    const sharedLock = new MockLock() as unknown as DistributedLockService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = new ExpiredCleanupJob(repo as any, sharedLock);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = new ExpiredCleanupJob(repo as any, sharedLock);

    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    const executed = [r1, r2].filter((r) => r.executed).length;
    expect(executed).toBe(1);
  });

  it('do() 抛错被捕获并记录到 metrics', async () => {
    const repo = { delete: jest.fn().mockRejectedValue(new Error('db down')) };
    const lock = new MockLock() as unknown as DistributedLockService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = new ExpiredCleanupJob(repo as any, lock);
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(r.error).toBe('db down');
    expect(job.getMetrics().failed).toBe(1);
    expect(job.getMetrics().lastError).toBe('db down');
  });
});

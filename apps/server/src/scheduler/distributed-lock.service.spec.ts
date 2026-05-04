import { DistributedLockService } from './distributed-lock.service';

/**
 * 不依赖真实 Redis 的内存 Mock — 仅实现 set/get/eval(NX 语义)。
 */
class MockRedis {
  private store = new Map<string, { value: string; expireAt: number }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: string, ...args: any[]): Promise<'OK' | null> {
    let pxMs: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'PX') pxMs = Number(args[++i]);
      if (args[i] === 'NX') nx = true;
    }
    const now = Date.now();
    const existing = this.store.get(key);
    if (nx && existing && existing.expireAt > now) return null;
    this.store.set(key, { value, expireAt: now + (pxMs ?? 60_000) });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.expireAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return e.value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async eval(_lua: string, _numKeys: number, key: string, expected: string): Promise<number> {
    const cur = await this.get(key);
    if (cur === expected) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }
}

describe('DistributedLockService', () => {
  it('两个实例并发只有一个 acquire 成功', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redis = new MockRedis() as any;
    const a = new DistributedLockService(redis);
    const b = new DistributedLockService(redis);

    const [tA, tB] = await Promise.all([a.acquire('job:test', 5_000), b.acquire('job:test', 5_000)]);
    const winners = [tA, tB].filter((x) => x !== null);
    expect(winners).toHaveLength(1);
  });

  it('release 后第二次可重新 acquire', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redis = new MockRedis() as any;
    const svc = new DistributedLockService(redis);
    const t1 = await svc.acquire('job:test2', 5_000);
    expect(t1).not.toBeNull();
    await svc.release('job:test2', t1!);
    const t2 = await svc.acquire('job:test2', 5_000);
    expect(t2).not.toBeNull();
  });

  it('release 用错误 token 不删除别人的锁', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redis = new MockRedis() as any;
    const a = new DistributedLockService(redis);
    const b = new DistributedLockService(redis);
    const tA = await a.acquire('job:test3', 5_000);
    expect(tA).not.toBeNull();
    await b.release('job:test3', 'wrong-token');
    // a 仍持有锁 — b 重新申请失败
    const tB = await b.acquire('job:test3', 5_000);
    expect(tB).toBeNull();
  });
});

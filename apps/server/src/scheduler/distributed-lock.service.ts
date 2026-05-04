/**
 * 基于 Redis SET NX PX 的分布式锁。
 * 用法:
 *   const acquired = await lock.acquire('job:expired-cleanup', 60_000);
 *   if (!acquired) return; // 别的实例在跑
 *   try { ... } finally { await lock.release(...); }
 */
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '../config/redis.module';

const LOCK_PREFIX = 'lock:scheduler:';

@Injectable()
export class DistributedLockService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * 尝试获取分布式锁。
   * @param key 业务 key(自动加前缀)
   * @param ttlMs 锁超时(防止持锁实例宕机后死锁)
   * @returns 持锁者 token(用于 release 校验);未获取时返回 null
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const fullKey = LOCK_PREFIX + key;
    const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const res = await this.redis.set(fullKey, token, 'PX', ttlMs, 'NX');
    return res === 'OK' ? token : null;
  }

  /**
   * 释放分布式锁。仅当 token 匹配时才删除(避免误删别人持有的锁)。
   */
  async release(key: string, token: string): Promise<void> {
    const fullKey = LOCK_PREFIX + key;
    const lua = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(lua, 1, fullKey, token);
  }
}

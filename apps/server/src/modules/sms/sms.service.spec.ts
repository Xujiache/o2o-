import { HttpException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { IntegrationRequestLog, SmsCode } from '../../database/entities';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { SmsService } from './sms.service';

class FakeRedis {
  private store = new Map<string, { v: string; expireAt: number }>();
  private now = (): number => Date.now();
  async set(key: string, val: string, _exFlag?: string, ttl?: number, nxFlag?: string): Promise<'OK' | null> {
    const existing = this.store.get(key);
    if (nxFlag === 'NX' && existing && existing.expireAt > this.now()) return null;
    const exp = ttl ? this.now() + ttl * 1000 : Number.MAX_SAFE_INTEGER;
    this.store.set(key, { v: val, expireAt: exp });
    return 'OK';
  }
  async incr(key: string): Promise<number> {
    const cur = this.store.get(key);
    const v = cur && cur.expireAt > this.now() ? Number(cur.v) + 1 : 1;
    this.store.set(key, { v: String(v), expireAt: cur?.expireAt ?? Number.MAX_SAFE_INTEGER });
    return v;
  }
  async expire(key: string, ttl: number): Promise<number> {
    const cur = this.store.get(key);
    if (!cur) return 0;
    cur.expireAt = this.now() + ttl * 1000;
    return 1;
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

describe('SmsService', () => {
  let svc: SmsService;
  let smsRepo: jest.Mocked<Repository<SmsCode>>;
  let logRepo: jest.Mocked<Repository<IntegrationRequestLog>>;
  let gateway: { sms: { send: jest.Mock } };
  let redis: FakeRedis;

  const insertedCodes: SmsCode[] = [];

  beforeEach(() => {
    insertedCodes.length = 0;
    smsRepo = {
      create: jest.fn((dto: Partial<SmsCode>) => dto as SmsCode),
      save: jest.fn(async (row: SmsCode) => {
        insertedCodes.push(row);
        return { ...row, codeId: '1' } as SmsCode;
      }),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.where = jest.fn(chain);
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.getOne = jest.fn(async () => insertedCodes[insertedCodes.length - 1] ?? null);
        qb.update = jest.fn(chain);
        qb.set = jest.fn(chain);
        qb.execute = jest.fn(async () => ({ affected: 1 }));
        return qb as never;
      }),
    } as unknown as jest.Mocked<Repository<SmsCode>>;
    logRepo = {
      insert: jest.fn(async () => ({})),
    } as unknown as jest.Mocked<Repository<IntegrationRequestLog>>;
    gateway = {
      sms: {
        send: jest.fn(async () => ({ success: true, providerRequestId: 'mock-abc' })),
      },
    };
    redis = new FakeRedis();
    svc = new SmsService(smsRepo, logRepo, redis as never, gateway as unknown as IntegrationGatewayService);
  });

  it('happy:sendCode 写表 + 调适配器 + 写日志 + 返回 sendResult=true', async () => {
    const r = await svc.sendCode('13800000001', 'login', '127.0.0.1');
    expect(r.sendResult).toBe(true);
    expect(r.expireSeconds).toBe(300);
    expect(r.requestId).toBe('mock-abc');
    expect(smsRepo.save).toHaveBeenCalledTimes(1);
    expect(gateway.sms.send).toHaveBeenCalledTimes(1);
    expect(logRepo.insert).toHaveBeenCalledTimes(1);
    const firstCall = logRepo.insert.mock.calls[0];
    const logArg = (firstCall ? firstCall[0] : {}) as { provider: string; status: string };
    expect(logArg.provider).toBe('ali-sms');
    expect(logArg.status).toBe('success');
  });

  it('限频:同手机号 60s 第二次 → RATE_LIMIT_EXCEEDED', async () => {
    await svc.sendCode('13800000002', 'login', '1.1.1.1');
    await expect(svc.sendCode('13800000002', 'login', '1.1.1.1')).rejects.toBeInstanceOf(HttpException);
  });

  it('限频:同 IP 60s 第 6 次 → RATE_LIMIT_EXCEEDED', async () => {
    for (let i = 0; i < 5; i++) {
      await svc.sendCode(`1380000000${i}`, 'login', '2.2.2.2');
    }
    await expect(svc.sendCode('13888888888', 'login', '2.2.2.2')).rejects.toBeInstanceOf(HttpException);
  });

  it('第三方失败:抛 THIRD_PARTY_ERROR + 写 failed 日志', async () => {
    gateway.sms.send.mockRejectedValueOnce(new Error('upstream timeout'));
    await expect(svc.sendCode('13800000003', 'login', '3.3.3.3')).rejects.toBeInstanceOf(HttpException);
    expect(logRepo.insert).toHaveBeenCalled();
    const logArg = logRepo.insert.mock.calls.at(-1)?.[0] as { status: string };
    expect(logArg.status).toBe('failed');
  });

  it('verifyCode:6 位匹配返回 true,格式不对返回 false', async () => {
    await svc.sendCode('13800000004', 'login', '4.4.4.4');
    const last = insertedCodes[insertedCodes.length - 1]!;
    const ok = await svc.verifyCode('13800000004', 'login', last.code);
    expect(ok).toBe(true);
    const bad = await svc.verifyCode('13800000004', 'login', 'abcdef');
    expect(bad).toBe(false);
  });

  it('consumeCode:UPDATE 命中行 → true', async () => {
    const ok = await svc.consumeCode('13800000005', 'login', '123456');
    expect(ok).toBe(true);
  });
});

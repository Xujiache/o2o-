import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import type { RiderAccount, RiderWithdrawal, SysConfig } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { SmsService } from '../sms/sms.service';

import { RiderWithdrawalService } from './rider-withdrawal.service';

interface World {
  withdrawals: RiderWithdrawal[];
  accounts: RiderAccount[];
  configs: SysConfig[];
  smsValid: boolean;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.withdrawals.filter((x) => {
        if (where.riderId && x.riderId !== where.riderId) return false;
        if (where.status && x.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.withdrawals.filter((x) => (where.riderId ? x.riderId === where.riderId : true));
    }),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, riderWithdrawalId: String(w.withdrawals.length + 1) };
      w.withdrawals.push(inserted);
      return inserted;
    }),
  };
  const accountRepo: any = {
    findOne: jest.fn(async (opt: any) => w.accounts.find((a) => a.riderId === opt.where.riderId) ?? null),
  };
  const sysConfigRepo: any = {
    findOne: jest.fn(async (opt: any) => w.configs.find((c) => c.configKey === opt.where.configKey) ?? null),
  };
  const smsService = {
    verifyCode: jest.fn(async () => w.smsValid),
  } as unknown as SmsService;
  const eventBus = {
    publish: jest.fn(async () => ({ eventId: 'e1' })),
  } as unknown as DomainEventBus;
  const svc = new RiderWithdrawalService(repo, accountRepo, sysConfigRepo, smsService, eventBus);
  return { svc };
  /* eslint-enable */
}

describe('RiderWithdrawalService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      withdrawals: [],
      accounts: [{ riderId: '30001', mobile: '13800000001', accountStatus: 'active' } as RiderAccount],
      configs: [],
      smsValid: true,
    };
  });

  it('成功创建提现', async () => {
    const { svc } = buildService(w);
    const r = await svc.create('30001', { amountCents: 50000, mobile: '13800000001', smsCode: '123456' });
    expect(r.status).toBe('PENDING');
    expect(r.withdrawalNo).toMatch(/^RW\d{14}$/);
  });

  it('rider 未实名(account_status disabled)抛 FORBIDDEN', async () => {
    w.accounts[0]!.accountStatus = 'disabled';
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 50000, mobile: '13800000001', smsCode: '123456' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rider account 不存在抛 FORBIDDEN', async () => {
    w.accounts = [];
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 50000, mobile: '13800000001', smsCode: '123456' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('单笔超限抛 INVALID_PARAM', async () => {
    const { svc } = buildService(w);
    await expect(
      svc.create('30001', { amountCents: 999999, mobile: '13800000001', smsCode: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('当日总额超限抛 INVALID_PARAM', async () => {
    w.withdrawals.push({
      riderId: '30001',
      amountCents: '950000',
      status: 'PENDING',
      submittedAt: String(Date.now()),
    } as RiderWithdrawal);
    const { svc } = buildService(w);
    await expect(
      svc.create('30001', { amountCents: 100000, mobile: '13800000001', smsCode: '123456' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sms 验证失败抛 UNAUTHORIZED', async () => {
    w.smsValid = false;
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 50000, mobile: '13800000001', smsCode: '000000' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('list 仅返回本骑手提现记录', async () => {
    w.withdrawals.push(
      {
        riderWithdrawalId: '1',
        riderId: '30001',
        withdrawalNo: 'RW1',
        amountCents: '10000',
        status: 'PENDING',
        submittedAt: String(Date.now()),
      } as RiderWithdrawal,
      {
        riderWithdrawalId: '2',
        riderId: '99999',
        withdrawalNo: 'RW2',
        amountCents: '10000',
        status: 'PENDING',
        submittedAt: String(Date.now()),
      } as RiderWithdrawal,
    );
    const { svc } = buildService(w);
    const r = await svc.list('30001', {});
    expect(r.total).toBe(1);
  });
});

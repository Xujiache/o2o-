import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

import type {
  MerchantAccount,
  MerchantSettlement,
  MerchantWithdrawal,
  Store,
  SysConfig,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { SmsService } from '../sms/sms.service';

import { MerchantWithdrawalService } from './merchant-withdrawal.service';

interface World {
  withdrawals: MerchantWithdrawal[];
  accounts: MerchantAccount[];
  stores: Store[];
  configs: SysConfig[];
  events: { name: string; payload: unknown }[];
  smsValid: boolean;
  settlements?: MerchantSettlement[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const withdrawalRepo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.withdrawals.filter((x) => {
        if (where.storeId && x.storeId !== where.storeId) return false;
        if (where.status && x.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.withdrawals.filter((x) => {
        if (where.storeId && x.storeId !== where.storeId) return false;
        return true;
      });
    }),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, merchantWithdrawalId: String(w.withdrawals.length + 1) };
      w.withdrawals.push(inserted);
      return inserted;
    }),
  };
  const accountRepo: any = {
    findOne: jest.fn(async (opt: any) => w.accounts.find((a) => a.merchantId === opt.where.merchantId) ?? null),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };
  const sysConfigRepo: any = {
    findOne: jest.fn(async (opt: any) => w.configs.find((c) => c.configKey === opt.where.configKey) ?? null),
  };
  const smsService = {
    verifyCode: jest.fn(async () => w.smsValid),
  } as unknown as SmsService;
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const settlementRepo: any = {
    find: jest.fn(async () => w.settlements ?? []),
  };
  const svc = new MerchantWithdrawalService(
    withdrawalRepo,
    accountRepo,
    settlementRepo,
    storeRepo,
    sysConfigRepo,
    smsService,
    eventBus,
  );
  return { svc };
  /* eslint-enable */
}

describe('MerchantWithdrawalService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      withdrawals: [],
      accounts: [{ merchantId: '30001', mobile: '13800000000', accountStatus: 'active' } as MerchantAccount],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
      configs: [],
      events: [],
      smsValid: true,
      // 预置 1 笔已 READY 结算 9,000,000 分,覆盖所有测试用例的提现金额
      settlements: [{ storeId: '20001', status: 'READY', netCents: '9000000' } as MerchantSettlement],
    };
  });

  it('成功创建提现 + emit MerchantWithdrawRequested', async () => {
    const { svc } = buildService(w);
    const r = await svc.create('30001', { amountCents: 100000, smsCode: '123456' });
    expect(r.status).toBe('PENDING');
    expect(r.withdrawalNo).toMatch(/^W\d{14}$/);
    expect(w.events[0]!.name).toBe('domain.merchant-withdrawal.requested');
  });

  it('商家未实名(account_status pending)抛 FORBIDDEN', async () => {
    w.accounts[0]!.accountStatus = 'pending';
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 100000, smsCode: '123456' })).rejects.toThrow(ForbiddenException);
  });

  it('单笔超限抛 INVALID_PARAM', async () => {
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 9999999, smsCode: '123456' })).rejects.toThrow(BadRequestException);
  });

  it('当日总额超限抛 INVALID_PARAM', async () => {
    w.withdrawals.push({
      storeId: '20001',
      amountCents: '4900000',
      status: 'PENDING',
      submittedAt: String(Date.now()),
    } as MerchantWithdrawal);
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 200000, smsCode: '123456' })).rejects.toThrow(BadRequestException);
  });

  it('sms 验证失败抛 UNAUTHORIZED', async () => {
    w.smsValid = false;
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 100000, smsCode: '000000' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('sysconfig 自定义额度生效', async () => {
    w.configs.push({
      configKey: 'merchant.withdrawal.limit',
      configValue: JSON.stringify({ single: 50000, daily: 100000 }),
    } as SysConfig);
    const { svc } = buildService(w);
    await expect(svc.create('30001', { amountCents: 60000, smsCode: '123456' })).rejects.toThrow(BadRequestException);
  });

  it('list 仅返回本商家提现记录', async () => {
    w.withdrawals.push({
      merchantWithdrawalId: '1',
      withdrawalNo: 'W1',
      storeId: '20001',
      amountCents: '100000',
      status: 'PENDING',
      submittedAt: String(Date.now()),
    } as MerchantWithdrawal);
    const { svc } = buildService(w);
    const r = await svc.list('30001', { pageNo: 1, pageSize: 20 });
    expect(r.total).toBe(1);
  });

  it('无 store 抛 FORBIDDEN', async () => {
    w.stores = [];
    const { svc } = buildService(w);
    await expect(svc.list('30001', {})).rejects.toThrow(ForbiddenException);
  });
});

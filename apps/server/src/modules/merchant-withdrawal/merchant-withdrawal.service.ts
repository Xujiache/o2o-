import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { MerchantAccount, MerchantWithdrawal, Store, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { SmsService } from '../sms/sms.service';

import type {
  CreateWithdrawalDto,
  CreateWithdrawalVo,
  WithdrawalListItemVo,
  WithdrawalListQueryDto,
  WithdrawalListVo,
} from './merchant-withdrawal.dto';

interface WithdrawalLimit {
  single: number;
  daily: number;
}

const DEFAULT_LIMIT: WithdrawalLimit = { single: 1000000, daily: 5000000 };

@Injectable()
export class MerchantWithdrawalService {
  constructor(
    @InjectRepository(MerchantWithdrawal)
    private readonly withdrawalRepo: Repository<MerchantWithdrawal>,
    @InjectRepository(MerchantAccount)
    private readonly accountRepo: Repository<MerchantAccount>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly smsService: SmsService,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async getLimit(): Promise<WithdrawalLimit> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'merchant.withdrawal.limit' } });
    if (!cfg) return DEFAULT_LIMIT;
    try {
      const parsed = JSON.parse(cfg.configValue) as Partial<WithdrawalLimit>;
      return {
        single: Number(parsed.single ?? DEFAULT_LIMIT.single),
        daily: Number(parsed.daily ?? DEFAULT_LIMIT.daily),
      };
    } catch {
      return DEFAULT_LIMIT;
    }
  }

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  private async ensureRealnameApproved(merchantId: string): Promise<MerchantAccount> {
    const acct = await this.accountRepo.findOne({ where: { merchantId } });
    if (!acct) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant account not found' });
    }
    if (acct.accountStatus !== 'active') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'merchant not realname-approved',
      });
    }
    return acct;
  }

  async list(merchantId: string, query: WithdrawalListQueryDto): Promise<WithdrawalListVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { storeId: store.storeId };
    if (query.status) where.status = query.status;

    const [rows, total] = await this.withdrawalRepo.findAndCount({
      where,
      order: { submittedAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: WithdrawalListItemVo[] = rows.map((r) => ({
      withdrawalId: r.merchantWithdrawalId,
      withdrawalNo: r.withdrawalNo,
      amountCents: r.amountCents,
      status: r.status,
      submittedAt: Number(r.submittedAt),
      completedAt: r.completedAt ? Number(r.completedAt) : null,
      failReason: r.failReason,
    }));
    return { items, total, pageNo, pageSize };
  }

  async create(merchantId: string, dto: CreateWithdrawalDto): Promise<CreateWithdrawalVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const acct = await this.ensureRealnameApproved(merchantId);

    const limit = await this.getLimit();
    if (dto.amountCents > limit.single) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        message: `amount exceeds single limit ${limit.single}`,
      });
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayWithdrawals = await this.withdrawalRepo.find({
      where: {
        storeId: store.storeId,
        submittedAt: MoreThanOrEqual(String(dayStart.getTime())),
      },
    });
    const todayActive = todayWithdrawals.filter((w) => w.status !== 'REJECTED' && w.status !== 'FAILED');
    const dailyTotal = todayActive.reduce((acc, w) => acc + Number(w.amountCents), 0);
    if (dailyTotal + dto.amountCents > limit.daily) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        message: `amount + dailyTotal exceeds daily limit ${limit.daily}`,
      });
    }

    const ok = await this.smsService.verifyCode(acct.mobile, 'sensitive', dto.smsCode);
    if (!ok) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'sms code invalid' });
    }

    const now = Date.now();
    const withdrawalNo = `W${this.formatDate(now)}${String(now).slice(-6)}`;
    const inserted = await this.withdrawalRepo.save(
      this.withdrawalRepo.create({
        withdrawalNo,
        merchantId,
        storeId: store.storeId,
        amountCents: String(dto.amountCents),
        accountId: dto.accountId ?? null,
        status: 'PENDING',
        submittedAt: String(now),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    await this.eventBus.publish(
      EventName.MerchantWithdrawRequested,
      {
        withdrawalId: inserted.merchantWithdrawalId,
        storeId: store.storeId,
        merchantId,
        amountCents: String(dto.amountCents),
        requestedAt: now,
      },
      { bizType: 'merchant-withdrawal', bizId: inserted.merchantWithdrawalId },
    );

    return {
      withdrawalId: inserted.merchantWithdrawalId,
      withdrawalNo,
      status: 'PENDING',
      submittedAt: now,
    };
  }

  private formatDate(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  }
}

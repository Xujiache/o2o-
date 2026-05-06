import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { RiderAccount, RiderWithdrawal, SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { SmsService } from '../sms/sms.service';

import type {
  CreateWithdrawalDto,
  CreateWithdrawalVo,
  WithdrawalListItemVo,
  WithdrawalListQueryDto,
  WithdrawalListVo,
} from './rider-withdrawal.dto';

interface WithdrawalLimit {
  single: number;
  daily: number;
}

const DEFAULT_LIMIT: WithdrawalLimit = { single: 100000, daily: 1000000 };

@Injectable()
export class RiderWithdrawalService {
  constructor(
    @InjectRepository(RiderWithdrawal)
    private readonly withdrawalRepo: Repository<RiderWithdrawal>,
    @InjectRepository(RiderAccount) private readonly accountRepo: Repository<RiderAccount>,
    @InjectRepository(SysConfig) private readonly sysConfigRepo: Repository<SysConfig>,
    private readonly smsService: SmsService,
    private readonly eventBus: DomainEventBus,
  ) {}

  private async getLimit(): Promise<WithdrawalLimit> {
    const cfg = await this.sysConfigRepo.findOne({ where: { configKey: 'rider.withdrawal.limit' } });
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

  async list(riderId: string, query: WithdrawalListQueryDto): Promise<WithdrawalListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { riderId };
    if (query.status) where.status = query.status;

    const [rows, total] = await this.withdrawalRepo.findAndCount({
      where,
      order: { submittedAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: WithdrawalListItemVo[] = rows.map((r) => ({
      withdrawalId: r.riderWithdrawalId,
      withdrawalNo: r.withdrawalNo,
      amountCents: r.amountCents,
      status: r.status,
      submittedAt: Number(r.submittedAt),
      completedAt: r.completedAt ? Number(r.completedAt) : null,
      failReason: r.failReason,
    }));
    return { items, total, pageNo, pageSize };
  }

  async create(riderId: string, dto: CreateWithdrawalDto): Promise<CreateWithdrawalVo> {
    const acct = await this.accountRepo.findOne({ where: { riderId } });
    if (!acct) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'rider account not found' });
    }
    if (acct.accountStatus !== 'active') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'rider not realname-approved',
      });
    }

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
      where: { riderId, submittedAt: MoreThanOrEqual(String(dayStart.getTime())) },
    });
    const todayActive = todayWithdrawals.filter((w) => w.status !== 'REJECTED' && w.status !== 'FAILED');
    const dailyTotal = todayActive.reduce((acc, w) => acc + Number(w.amountCents), 0);
    if (dailyTotal + dto.amountCents > limit.daily) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PARAM,
        message: `amount + dailyTotal exceeds daily limit ${limit.daily}`,
      });
    }

    const ok = await this.smsService.verifyCode(dto.mobile, 'sensitive', dto.smsCode);
    if (!ok) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'sms code invalid' });
    }

    const now = Date.now();
    const withdrawalNo = `RW${this.formatDate(now)}${String(now).slice(-6)}`;
    const inserted = await this.withdrawalRepo.save(
      this.withdrawalRepo.create({
        withdrawalNo,
        riderId,
        amountCents: String(dto.amountCents),
        accountId: dto.accountId ?? null,
        status: 'PENDING',
        submittedAt: String(now),
        createdAt: String(now),
        updatedAt: String(now),
      }),
    );

    return {
      withdrawalId: inserted.riderWithdrawalId,
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

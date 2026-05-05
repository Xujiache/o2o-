import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { MerchantWithdrawal } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const MOCK_PROCESS_DELAY_MS = 30 * 1000;
const SCAN_LIMIT = 200;

/**
 * Stage 7 — 提现状态轮询 job(mock 自动 PENDING → APPROVED → COMPLETED)。
 * 真生产由 stage 11 接入支付通道异步回调,本阶段仅用 cron 模拟通道处理。
 */
@Injectable()
export class WithdrawalStatusPollJob extends BaseJob {
  readonly name = 'withdrawal-status-poll';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(MerchantWithdrawal)
    private readonly withdrawalRepo: Repository<MerchantWithdrawal>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 * * * * *', { name: 'withdrawal-status-poll' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const cutoff = now - MOCK_PROCESS_DELAY_MS;

    const pendings = await this.withdrawalRepo.find({
      where: { status: 'PENDING', submittedAt: LessThan(String(cutoff)) },
      take: SCAN_LIMIT,
    });
    for (const w of pendings) {
      await this.withdrawalRepo.update(
        { merchantWithdrawalId: w.merchantWithdrawalId },
        { status: 'APPROVED', updatedAt: String(now) },
      );
      this.logger.log(`[withdrawal-status-poll] PENDING → APPROVED ${w.merchantWithdrawalId}`);
    }

    const approveCutoff = now - MOCK_PROCESS_DELAY_MS;
    const approved = await this.withdrawalRepo.find({
      where: { status: 'APPROVED', updatedAt: LessThan(String(approveCutoff)) },
      take: SCAN_LIMIT,
    });
    for (const w of approved) {
      await this.withdrawalRepo.update(
        { merchantWithdrawalId: w.merchantWithdrawalId },
        { status: 'COMPLETED', completedAt: String(now), updatedAt: String(now) },
      );
      this.logger.log(`[withdrawal-status-poll] APPROVED → COMPLETED ${w.merchantWithdrawalId}`);
    }
  }
}

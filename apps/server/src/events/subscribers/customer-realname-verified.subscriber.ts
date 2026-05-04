import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiskUserTag } from '../../database/entities';
import { type CustomerRealnameVerifiedPayload, EventName } from '../events';

@Injectable()
export class CustomerRealnameVerifiedSubscriber {
  private readonly logger = new Logger(CustomerRealnameVerifiedSubscriber.name);

  constructor(@InjectRepository(RiskUserTag) private readonly riskRepo: Repository<RiskUserTag>) {}

  @OnEvent(EventName.CustomerRealnameVerified)
  async handle(payload: CustomerRealnameVerifiedPayload): Promise<void> {
    // 占位:解锁高额跑腿 — 删除 high_value_blocked 风控标签
    const r = await this.riskRepo.delete({ userId: payload.userId, tagType: 'high_value_blocked' });
    this.logger.log(
      `[customer.realname-verified] userId=${payload.userId} cleared ${r.affected ?? 0} high_value_blocked risk tags`,
    );
  }
}

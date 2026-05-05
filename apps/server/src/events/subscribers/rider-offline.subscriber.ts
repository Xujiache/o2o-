import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IntegrationRequestLog, RiderStatus } from '../../database/entities';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type RiderOfflinePayload } from '../events';

@Injectable()
export class RiderOfflineSubscriber {
  private readonly logger = new Logger(RiderOfflineSubscriber.name);

  constructor(
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(IntegrationRequestLog) private readonly logRepo: Repository<IntegrationRequestLog>,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.RiderOffline)
  async handle(payload: RiderOfflinePayload): Promise<void> {
    this.logger.log(`[rider.offline] riderId=${payload.riderId} reason=${payload.reason}`);

    // 调 push.unbindDevice mock(失败 warn 不阻塞)
    const status = await this.statusRepo.findOne({ where: { riderId: payload.riderId } });
    if (status?.deviceToken) {
      try {
        const r = await this.gateway.getui.unbindDevice({
          riderId: payload.riderId,
          deviceToken: status.deviceToken,
        });
        const now = String(Date.now());
        await this.logRepo.insert({
          provider: 'getui',
          requestId: r.providerRequestId,
          endpoint: 'getui.unbindDevice',
          requestPayload: JSON.stringify({ riderId: payload.riderId }),
          responsePayload: JSON.stringify(r),
          status: r.success ? 'success' : 'failed',
          retryCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      } catch (err) {
        this.logger.warn({ err }, `[rider.offline] unbindDevice failed`);
      }
    }
  }
}

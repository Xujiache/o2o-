import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type RiderLocationUpdatedPayload } from '../events';

@Injectable()
export class RiderLocationUpdatedSubscriber {
  private readonly logger = new Logger(RiderLocationUpdatedSubscriber.name);

  @OnEvent(EventName.RiderLocationUpdated)
  handle(payload: RiderLocationUpdatedPayload): void {
    this.logger.debug(
      `[rider.location-updated] riderId=${payload.riderId} batchSize=${payload.batchSize} lastLng=${payload.lastLng} lastLat=${payload.lastLat}`,
    );
    // stage 8 调度匹配:更新骑手位置到 Redis ZSET / 触发可接订单匹配;本阶段空实现
  }
}

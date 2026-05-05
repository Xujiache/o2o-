import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type RiderSubmittedPayload } from '../events';

@Injectable()
export class RiderSubmittedSubscriber {
  private readonly logger = new Logger(RiderSubmittedSubscriber.name);

  @OnEvent(EventName.RiderSubmitted)
  handle(payload: RiderSubmittedPayload): void {
    this.logger.log(`[rider.submitted] applicationId=${payload.applicationId} riderId=${payload.riderId} mobile=***`);
    // 业务后续:留 stage 11 接通知(短信 / 平台小程序);本阶段仅记录日志
  }
}

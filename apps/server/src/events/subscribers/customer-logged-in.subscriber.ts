import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { type CustomerLoggedInPayload, EventName } from '../events';

@Injectable()
export class CustomerLoggedInSubscriber {
  private readonly logger = new Logger(CustomerLoggedInSubscriber.name);

  @OnEvent(EventName.CustomerLoggedIn)
  handle(payload: CustomerLoggedInPayload): void {
    this.logger.log(
      `[customer.logged-in] userId=${payload.userId} scene=${payload.scene} device=${payload.deviceId} ip=${payload.ip}`,
    );
    // 异地检测在 LoginAnomalyDetectionJob;此处仅落审计日志
  }
}

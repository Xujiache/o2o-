import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { type CustomerRegisteredPayload, EventName } from '../events';

@Injectable()
export class CustomerRegisteredSubscriber {
  private readonly logger = new Logger(CustomerRegisteredSubscriber.name);

  @OnEvent(EventName.CustomerRegistered)
  handle(payload: CustomerRegisteredPayload): void {
    this.logger.log(
      `[customer.registered] userId=${payload.userId} source=${payload.registerSource} device=${payload.deviceId ?? '-'}`,
    );
    // stage 11+ 在此触发欢迎短信 / 营销初始化 / 风控初评分
  }
}

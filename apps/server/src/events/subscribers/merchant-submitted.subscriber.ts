import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type MerchantSubmittedPayload } from '../events';

@Injectable()
export class MerchantSubmittedSubscriber {
  private readonly logger = new Logger(MerchantSubmittedSubscriber.name);

  @OnEvent(EventName.MerchantSubmitted)
  handle(payload: MerchantSubmittedPayload): void {
    this.logger.log(`[merchant.submitted] merchantId=${payload.merchantId} applicationId=${payload.applicationId}`);
    // stage 11+ 在此触发平台运营推送通知
  }
}

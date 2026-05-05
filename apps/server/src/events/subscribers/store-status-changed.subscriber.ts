import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type StoreStatusChangedPayload } from '../events';

@Injectable()
export class StoreStatusChangedSubscriber {
  private readonly logger = new Logger(StoreStatusChangedSubscriber.name);

  @OnEvent(EventName.StoreStatusChanged)
  handle(payload: StoreStatusChangedPayload): void {
    this.logger.log(
      `[store.status-changed] storeId=${payload.storeId} ${payload.beforeStatus}→${payload.afterStatus} by ${payload.operatorType}`,
    );
    // stage 5+ 在此清用户端店铺缓存 / 触发实时通知
  }
}

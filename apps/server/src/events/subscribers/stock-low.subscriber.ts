import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type StockLowPayload } from '../events';

@Injectable()
export class StockLowSubscriber {
  private readonly logger = new Logger(StockLowSubscriber.name);

  @OnEvent(EventName.StockLow)
  handle(payload: StockLowPayload): void {
    this.logger.warn(
      `[stock.low] productId=${payload.productId} storeId=${payload.storeId} stock=${payload.currentStock}/${payload.threshold}`,
    );
    // stage 11+ 在此调 getui mock push 通知商家
  }
}

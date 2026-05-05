import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type RiderOnlinePayload } from '../events';

@Injectable()
export class RiderOnlineSubscriber {
  private readonly logger = new Logger(RiderOnlineSubscriber.name);

  @OnEvent(EventName.RiderOnline)
  handle(payload: RiderOnlinePayload): void {
    this.logger.log(`[rider.online] riderId=${payload.riderId} platform=${payload.platform ?? 'n/a'}`);
    // 后续:stage 8 调度匹配 — 把 rider 加入"在线骑手池";本阶段空实现
  }
}

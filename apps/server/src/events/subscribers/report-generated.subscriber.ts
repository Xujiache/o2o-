import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type ReportGeneratedPayload } from '../events';

@Injectable()
export class ReportGeneratedSubscriber {
  private readonly logger = new Logger(ReportGeneratedSubscriber.name);

  @OnEvent(EventName.ReportGenerated)
  handle(payload: ReportGeneratedPayload): void {
    this.logger.log(
      `[dashboard.report-generated] date=${payload.snapshotDate} city=${payload.cityCode} at=${payload.generatedAt}`,
    );
  }
}

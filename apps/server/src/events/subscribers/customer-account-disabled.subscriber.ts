import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CustomerAuthService } from '../../modules/customer-auth/customer-auth.service';
import { type CustomerAccountDisabledPayload, EventName } from '../events';

@Injectable()
export class CustomerAccountDisabledSubscriber {
  private readonly logger = new Logger(CustomerAccountDisabledSubscriber.name);

  constructor(private readonly customerAuth: CustomerAuthService) {}

  @OnEvent(EventName.CustomerAccountDisabled)
  async handle(payload: CustomerAccountDisabledPayload): Promise<void> {
    await this.customerAuth.revokeAllDevices(payload.userId);
    this.logger.log(
      `[customer.account-disabled] userId=${payload.userId} revoked all devices (operator=${payload.operatorId})`,
    );
    // jti 黑名单写入由 logout / refresh 流程承担:已 disabled 用户下次 refresh 失败,access token 自然过期
  }
}

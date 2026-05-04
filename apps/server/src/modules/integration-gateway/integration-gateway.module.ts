import { Global, Module } from '@nestjs/common';

import { CallbackIdempotencyInterceptor } from './callback/callback-idempotency.interceptor';
import { CallbackReplayGuard } from './callback/callback-replay.guard';
import { IntegrationGatewayService } from './integration-gateway.service';

@Global()
@Module({
  providers: [IntegrationGatewayService, CallbackReplayGuard, CallbackIdempotencyInterceptor],
  exports: [IntegrationGatewayService, CallbackReplayGuard, CallbackIdempotencyInterceptor],
})
export class IntegrationGatewayModule {}

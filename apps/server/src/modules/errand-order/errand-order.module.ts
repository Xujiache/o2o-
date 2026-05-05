import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ErrandAttachment,
  ErrandOrder,
  ErrandOrderDetail,
  ErrandPriceSnapshot,
  ErrandQuote,
  ErrandTask,
  ErrandTimeline,
} from '../../database/entities';
import { ErrandPricingModule } from '../errand-pricing/errand-pricing.module';
import { ErrandTypeModule } from '../errand-type/errand-type.module';
import { IntegrationGatewayModule } from '../integration-gateway/integration-gateway.module';
import { PaymentModule } from '../payment/payment.module';
import { ProhibitedItemModule } from '../prohibited-item/prohibited-item.module';

import { ErrandOrderController } from './errand-order.controller';
import { ErrandOrderService } from './errand-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ErrandQuote,
      ErrandOrder,
      ErrandOrderDetail,
      ErrandAttachment,
      ErrandPriceSnapshot,
      ErrandTimeline,
      ErrandTask,
    ]),
    ErrandTypeModule,
    ErrandPricingModule,
    ProhibitedItemModule,
    IntegrationGatewayModule,
    PaymentModule,
  ],
  controllers: [ErrandOrderController],
  providers: [ErrandOrderService],
  exports: [ErrandOrderService],
})
export class ErrandOrderModule {}

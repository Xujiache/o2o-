import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RefundOrder } from '../../database/entities';

import { AdminRefundController } from './admin-refund.controller';
import { AdminRefundService } from './admin-refund.service';
import { RefundCallbackController } from './refund-callback.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RefundOrder])],
  controllers: [AdminRefundController, RefundCallbackController],
  providers: [AdminRefundService],
  exports: [AdminRefundService],
})
export class AdminRefundModule {}

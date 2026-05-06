import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentOrder } from '../../database/entities';

import { AdminPaymentController } from './admin-payment.controller';
import { AdminPaymentService } from './admin-payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentOrder])],
  controllers: [AdminPaymentController],
  providers: [AdminPaymentService],
  exports: [AdminPaymentService],
})
export class AdminPaymentModule {}

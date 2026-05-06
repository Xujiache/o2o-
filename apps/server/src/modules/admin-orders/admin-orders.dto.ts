import { ApiProperty } from '@nestjs/swagger';

export class AdminTimelineItemVo {
  @ApiProperty() at!: number;
  @ApiProperty({ nullable: true }) fromStatus!: string | null;
  @ApiProperty() toStatus!: string;
  @ApiProperty() actor!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

export class AdminOperatorLogVo {
  @ApiProperty() at!: number;
  @ApiProperty() operatorType!: string;
  @ApiProperty({ nullable: true }) operatorId!: string | null;
  @ApiProperty({ nullable: true }) beforeStatus!: string | null;
  @ApiProperty({ nullable: true }) afterStatus!: string | null;
  @ApiProperty({ nullable: true }) summary!: string | null;
}

export class AdminDispatchLogVo {
  @ApiProperty() at!: number;
  @ApiProperty() dispatchTaskId!: string;
  @ApiProperty() riderId!: string;
  @ApiProperty() operatorAdminId!: string;
  @ApiProperty() beforeStatus!: string;
  @ApiProperty() afterStatus!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

export class AdminPaymentLogVo {
  @ApiProperty() payOrderId!: string;
  @ApiProperty() payOrderNo!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) paidAmount!: string | null;
  @ApiProperty({ nullable: true }) paidAt!: number | null;
  @ApiProperty({ nullable: true }) channelTradeNo!: string | null;
}

export class AdminOrderTimelineVo {
  @ApiProperty({ type: [AdminTimelineItemVo] }) timeline!: AdminTimelineItemVo[];
  @ApiProperty() currentStatus!: string;
  @ApiProperty({ type: [AdminOperatorLogVo] }) operatorLogs!: AdminOperatorLogVo[];
  @ApiProperty({ type: [AdminDispatchLogVo] }) dispatchLogs!: AdminDispatchLogVo[];
  @ApiProperty({ type: [AdminPaymentLogVo] }) paymentLogs!: AdminPaymentLogVo[];
}

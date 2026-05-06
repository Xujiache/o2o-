import { ApiProperty } from '@nestjs/swagger';

export class AdminCallbackLogVo {
  @ApiProperty({ nullable: true }) raw!: string | null;
  @ApiProperty({ nullable: true }) parsedAt!: number | null;
}

export class AdminPaymentVo {
  @ApiProperty() payOrderId!: string;
  @ApiProperty() payStatus!: string;
  @ApiProperty({ nullable: true }) paidAt!: number | null;
  @ApiProperty() amountFen!: string;
  @ApiProperty() channel!: string;
  @ApiProperty({ nullable: true }) thirdPartyTradeNo!: string | null;
  @ApiProperty({ type: [AdminCallbackLogVo] }) callbackLogs!: AdminCallbackLogVo[];
}

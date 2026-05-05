import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';

export class PrepayDto {
  @ApiProperty({ enum: ['FOOD', 'ERRAND'], description: '业务类型(stage 5 FOOD;stage 6 +ERRAND)' })
  @IsIn(['FOOD', 'ERRAND'])
  bizType!: 'FOOD' | 'ERRAND';

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  orderId!: string;

  @ApiProperty({ enum: ['wxpay', 'alipay'] })
  @IsIn(['wxpay', 'alipay'])
  payChannel!: 'wxpay' | 'alipay';
}

export class PrepayVo {
  @ApiProperty() @Expose() payOrderId!: string;
  @ApiProperty() @Expose() payOrderNo!: string;
  @ApiProperty({ description: '前端 SDK 唤起字符串' }) @Expose() payParams!: string;
  @ApiProperty() @Expose() expireAt!: number;
}

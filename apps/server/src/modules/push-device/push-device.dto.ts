import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BindPushDeviceDto {
  @ApiProperty({ description: '推送 token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deviceToken!: string;

  @ApiProperty({ enum: ['ios', 'android', 'wxmp'] })
  @IsIn(['ios', 'android', 'wxmp'])
  platform!: 'ios' | 'android' | 'wxmp';

  @ApiProperty({ enum: ['customer', 'merchant', 'rider'] })
  @IsIn(['customer', 'merchant', 'rider'])
  appType!: 'customer' | 'merchant' | 'rider';

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}

export class BindPushDeviceVo {
  @ApiProperty() bindId!: string;
  @ApiProperty() enabled!: boolean;
}

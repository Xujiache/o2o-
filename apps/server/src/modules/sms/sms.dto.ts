import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

import { SMS_SCENES, type SmsScene } from './sms.constants';

export class SendSmsCodeDto {
  @ApiProperty({ example: '13800000001' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'mobile must be a valid 11-digit Chinese mobile' })
  mobile!: string;

  @ApiProperty({ enum: SMS_SCENES })
  @IsIn(SMS_SCENES as readonly string[])
  scene!: SmsScene;

  @ApiProperty({ required: false, description: '图形验证码 token(可选,本阶段未启用)' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class SendSmsCodeVo {
  @ApiProperty({ example: true })
  sendResult!: boolean;

  @ApiProperty({ example: 300 })
  expireSeconds!: number;

  @ApiProperty({ example: 'mock-abc123' })
  requestId!: string;
}

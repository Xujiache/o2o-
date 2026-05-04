import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export class RealnameVerifyDto {
  @ApiProperty()
  @IsString()
  @Length(2, 50)
  realName!: string;

  @ApiProperty({ example: '110101199001011234' })
  @IsString()
  @Length(15, 18)
  idCardNo!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'smsCode must be 6 digits' })
  smsCode!: string;
}

export class RealnameVerifyVo {
  @ApiProperty({ enum: ['success', 'failed'] })
  verifyStatus!: 'success' | 'failed';

  @ApiProperty({ required: false })
  failedReason?: string;

  @ApiProperty({ required: false, description: '毫秒 Unix 时间戳' })
  verifiedAt?: number;
}

export class RealnameRecordVo {
  @ApiProperty()
  @Expose()
  recordId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  realName!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  idCardNo!: string;

  @ApiProperty()
  @Expose()
  status!: string;

  @ApiProperty({ required: false })
  @Expose()
  failedReason?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  verifiedAt?: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: string;
}

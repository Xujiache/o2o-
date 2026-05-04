import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export const PLATFORMS = ['mp-weixin', 'app-android', 'app-ios', 'h5'] as const;
export type Platform = (typeof PLATFORMS)[number];

export class LoginByMobileDto {
  @ApiProperty({ example: '13800000001' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'mobile must be a valid 11-digit Chinese mobile' })
  mobile!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;

  @ApiProperty({ example: 'device-abc' })
  @IsString()
  @Length(1, 64)
  deviceId!: string;

  @ApiProperty({ enum: PLATFORMS })
  @IsIn(PLATFORMS as readonly string[])
  platform!: Platform;
}

export class LoginByMobileVo {
  @ApiProperty()
  customerToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  isNewUser!: boolean;

  @ApiProperty()
  profileCompleted!: boolean;
}

export class LoginByWechatDto {
  @ApiProperty()
  @IsString()
  @Length(1, 256)
  jsCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iv?: string;

  @ApiProperty({ example: 'device-abc' })
  @IsString()
  @Length(1, 64)
  deviceId!: string;

  @ApiProperty({ enum: PLATFORMS })
  @IsIn(PLATFORMS as readonly string[])
  platform!: Platform;
}

export class LoginByWechatVo {
  @ApiProperty()
  customerToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ description: '为 true 时前端跳手机绑定流程' })
  bindMobileRequired!: boolean;

  @ApiProperty()
  isNewUser!: boolean;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @Length(32, 256)
  refreshToken!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 64)
  deviceId!: string;
}

export class RefreshTokenVo {
  @ApiProperty()
  customerToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class LogoutVo {
  @ApiProperty({ example: true })
  ok!: boolean;
}

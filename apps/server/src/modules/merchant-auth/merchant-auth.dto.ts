import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length, Matches } from 'class-validator';

export const PLATFORMS = ['app-android', 'app-ios'] as const;
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

  @ApiProperty({ example: 'merchant-dev-abc' })
  @IsString()
  @Length(1, 64)
  deviceId!: string;

  @ApiProperty({ enum: PLATFORMS })
  @IsIn(PLATFORMS as readonly string[])
  platform!: Platform;
}

export class LoginByMobileVo {
  @ApiProperty()
  merchantToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ enum: ['pending', 'active', 'disabled'] })
  accountStatus!: string;
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
  merchantToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class LogoutVo {
  @ApiProperty({ example: true })
  ok!: boolean;
}

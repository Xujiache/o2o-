import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CaptchaResponseVo {
  @ApiProperty({ example: '7c8e1f3b-...' })
  captchaId!: string;

  @ApiProperty({ example: '<svg ...>...</svg>' })
  svgImage!: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'super_admin' })
  @IsString()
  @Length(3, 64)
  @Matches(/^[A-Za-z0-9_]+$/, { message: 'username 只能包含字母数字下划线' })
  username!: string;

  @ApiProperty({ example: 'O2o@2026-Admin' })
  @IsString()
  @Length(6, 128)
  password!: string;

  @ApiProperty({ example: 'a2b4', description: 'mock 模式下传 dev 跳过校验' })
  @IsString()
  @Length(1, 16)
  captcha!: string;

  @ApiProperty({ example: '7c8e1f3b-...' })
  @IsString()
  @Length(1, 64)
  captchaId!: string;

  @ApiProperty({ example: 'admin-web-pc-abc', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  deviceId?: string;
}

export class AdminLoginVo {
  @ApiProperty()
  adminUserId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  adminToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: [String] })
  roleCodes!: string[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ type: [String] })
  menus!: string[];

  @ApiProperty({ description: '上一次登录时间(0 表示首次)' })
  lastLoginAt!: number;
}

export class AdminRefreshDto {
  @ApiProperty()
  @IsString()
  @Length(32, 256)
  refreshToken!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  deviceId?: string;
}

export class AdminRefreshVo {
  @ApiProperty()
  adminToken!: string;

  @ApiProperty()
  refreshToken!: string;
}

export class AdminLogoutVo {
  @ApiProperty({ example: true })
  ok!: boolean;
}

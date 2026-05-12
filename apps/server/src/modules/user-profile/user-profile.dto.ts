import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

import type { CustomerGender, CustomerRealnameStatus } from '../../database/entities';

export const CUSTOMER_GENDERS = ['unknown', 'male', 'female'] as const;

export class UpdateCustomerProfileDto {
  @ApiProperty({ example: '用户昵称' })
  @IsString()
  @Length(1, 64)
  nickname!: string;

  @ApiProperty({ required: false, example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  avatarUrl?: string;

  @ApiProperty({ enum: CUSTOMER_GENDERS })
  @IsIn(CUSTOMER_GENDERS as readonly string[])
  gender!: CustomerGender;

  @ApiProperty({ required: false, example: '1995-05-20' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthday must be YYYY-MM-DD' })
  birthday?: string;

  @ApiProperty({ required: false, example: '少放辣，多加葱' })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  bio?: string;
}

export class ChangeCustomerMobileDto {
  @ApiProperty({ example: '13800000001' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'mobile must be a valid 11-digit Chinese mobile' })
  mobile!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}

export class CustomerProfileVo {
  @ApiProperty()
  nickname!: string;

  @ApiProperty()
  avatarUrl!: string;

  @ApiProperty({ enum: CUSTOMER_GENDERS })
  gender!: CustomerGender;

  @ApiProperty()
  birthday!: string;

  @ApiProperty()
  bio!: string;

  @ApiProperty()
  mobile!: string;

  @ApiProperty({ enum: ['unverified', 'pending', 'verified', 'failed'] })
  realnameStatus!: CustomerRealnameStatus;

  @ApiProperty()
  profileCompleted!: boolean;

  @ApiProperty()
  updatedAt!: number;
}

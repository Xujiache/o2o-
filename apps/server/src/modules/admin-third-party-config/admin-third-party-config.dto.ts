import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const STATUSES = ['active', 'disabled', 'error'] as const;

export class ThirdPartyConfigItemVo {
  @ApiProperty()
  @Expose()
  provider!: string;

  @ApiProperty()
  @Expose()
  env!: string;

  @ApiProperty({ enum: STATUSES })
  @Expose()
  status!: (typeof STATUSES)[number];

  @ApiProperty({ description: 'secret 脱敏(前 3 + *** + 后 3),无密钥时空串' })
  @Expose()
  secretMasked!: string;

  @ApiProperty({ required: false })
  @Expose()
  lastHealthAt?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  errorMessage?: string | null;

  @ApiProperty()
  @Expose()
  updatedAt!: string;
}

export class ThirdPartyConfigListVo {
  @ApiProperty({ type: [ThirdPartyConfigItemVo] })
  list!: ThirdPartyConfigItemVo[];
}

export class UpdateThirdPartyConfigDto {
  @ApiProperty({ required: false, description: '明文密钥;留空(undefined)表示不修改' })
  @IsOptional()
  @IsString()
  @Length(0, 4096)
  secret?: string;

  @ApiProperty({ required: false, enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES as readonly string[])
  status?: (typeof STATUSES)[number];
}

export class ThirdPartyConfigMutationVo {
  @ApiProperty()
  provider!: string;
  @ApiProperty()
  changedFields!: string[];
  @ApiProperty()
  updatedAt!: string;
}

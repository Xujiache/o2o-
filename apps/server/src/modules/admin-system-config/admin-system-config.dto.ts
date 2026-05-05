import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class SystemConfigItemVo {
  @ApiProperty()
  @Expose()
  configKey!: string;

  @ApiProperty()
  @Expose()
  configValue!: string;

  @ApiProperty()
  @Expose()
  scope!: string;

  @ApiProperty({ required: false })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  updatedAt!: string;
}

export class SystemConfigListVo {
  @ApiProperty({ type: [SystemConfigItemVo] })
  list!: SystemConfigItemVo[];
}

export class UpdateSystemConfigDto {
  @ApiProperty()
  @IsString()
  @Length(0, 4096)
  value!: string;
}

export class SystemConfigMutationVo {
  @ApiProperty()
  configKey!: string;
  @ApiProperty()
  configValue!: string;
  @ApiProperty()
  updatedAt!: string;
}

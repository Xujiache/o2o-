import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export const VEHICLE_TYPES = ['electric_bike', 'motorcycle', 'car'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export class UpdateVehicleDto {
  @ApiProperty({ enum: VEHICLE_TYPES })
  @IsIn(VEHICLE_TYPES as readonly string[])
  vehicleType!: VehicleType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  plateNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  brand?: string;
}

export class UpdateRiderProfileDto {
  @ApiProperty({ type: UpdateVehicleDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateVehicleDto)
  vehicle?: UpdateVehicleDto;
}

export class VehicleVo {
  @ApiProperty()
  @Expose()
  vehicleType!: string;

  @ApiProperty({ required: false })
  @Expose()
  plateNo?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  brand?: string | null;
}

export class RiderProfileVo {
  @ApiProperty()
  @Expose()
  riderId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobile!: string;

  @ApiProperty()
  @Expose()
  accountStatus!: string;

  @ApiProperty({ required: false })
  @Expose()
  realName?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  healthCertExpiry?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  approvedAt?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  vehicle?: VehicleVo | null;

  @ApiProperty()
  @Expose()
  creditScore!: number;

  @ApiProperty({ enum: ['online', 'offline', 'busy'], description: '当前在线状态(刷新后保留)' })
  @Expose()
  onlineStatus!: 'online' | 'offline' | 'busy';
}

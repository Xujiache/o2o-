import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Matches,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

import type { GeoJsonPolygon } from '../../database/entities';

/** GeoJSON Polygon 自定义校验:type=Polygon + coordinates 至少一个环且首尾闭合 */
function IsGeoJsonPolygon(options?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isGeoJsonPolygon',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (!value || typeof value !== 'object') return false;
          const v = value as { type?: string; coordinates?: number[][][] };
          if (v.type !== 'Polygon' || !Array.isArray(v.coordinates)) return false;
          if (v.coordinates.length === 0) return false;
          for (const ring of v.coordinates) {
            if (!Array.isArray(ring) || ring.length < 4) return false;
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (!first || !last) return false;
            if (first[0] !== last[0] || first[1] !== last[1]) return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid GeoJSON Polygon (type=Polygon, coordinates closed)`;
        },
      },
    });
  };
}

export class BusinessHourDto {
  @ApiProperty({ minimum: 0, maximum: 6, example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime!: string;

  @ApiProperty({ example: '22:00:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime!: string;
}

export class DeliveryAreaDto {
  @ApiProperty({ description: 'GeoJSON Polygon' })
  @IsGeoJsonPolygon()
  geometry!: GeoJsonPolygon;

  @ApiProperty({ example: 1500, description: '该区域起送价(分)' })
  @IsInt()
  @Min(0)
  minOrderAmount!: number;

  @ApiProperty({ example: 300, description: '该区域配送费(分)' })
  @IsInt()
  @Min(0)
  deliveryFee!: number;
}

export class UpdateStoreSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  avatarFileId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  intro?: string;

  @ApiProperty({ required: false, type: [BusinessHourDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  businessHours?: BusinessHourDto[];

  @ApiProperty({ required: false, type: [DeliveryAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryAreaDto)
  deliveryAreas?: DeliveryAreaDto[];

  @ApiProperty({ required: false, example: 1500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ required: false, example: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notice?: string;
}

export class UpdateStoreSettingsVo {
  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  updatedAt!: number;
}

export class SetBusinessStatusDto {
  @ApiProperty({ enum: ['online', 'offline'] })
  @IsIn(['online', 'offline'])
  businessStatus!: 'online' | 'offline';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}

export class SetBusinessStatusVo {
  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  businessStatus!: string;

  @ApiProperty()
  effectiveAt!: number;
}

export class StoreVo {
  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  merchantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  avatarFileId?: string | null;

  @ApiProperty({ required: false, description: '封面图实时签名 URL,15min 有效;null=未上传' })
  avatarUrl?: string | null;

  @ApiProperty({ required: false })
  intro?: string | null;

  @ApiProperty()
  businessScope!: string;

  @ApiProperty()
  businessStatus!: string;

  @ApiProperty()
  minOrderAmount!: string;

  @ApiProperty()
  deliveryFee!: string;

  @ApiProperty({ required: false })
  notice?: string | null;

  @ApiProperty({ required: false })
  cityCode?: string | null;

  @ApiProperty({ type: [BusinessHourDto] })
  businessHours!: BusinessHourDto[];

  @ApiProperty({ type: [DeliveryAreaDto] })
  deliveryAreas!: DeliveryAreaDto[];
}

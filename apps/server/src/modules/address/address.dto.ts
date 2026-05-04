import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export class ListAddressQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class UpsertAddressDto {
  @ApiProperty({ required: false, description: '更新时传 addressId' })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 50)
  receiverName!: string;

  @ApiProperty({ example: '13800000001' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'mobile must be a valid 11-digit Chinese mobile' })
  mobile!: string;

  @ApiProperty({ example: '110000' })
  @IsString()
  @Length(1, 20)
  cityCode!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  detail!: string;

  @ApiProperty({ example: 116.4074 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 39.9042 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isDefault!: boolean;
}

export class AddressItemVo {
  @ApiProperty()
  @Expose()
  addressId!: string;

  @ApiProperty()
  @Expose()
  receiverName!: string;

  @ApiProperty({ description: '脱敏 13****0001' })
  @Expose()
  @Mask('phone')
  mobileMasked!: string;

  @ApiProperty()
  @Expose()
  cityCode!: string;

  @ApiProperty()
  @Expose()
  detail!: string;

  @ApiProperty()
  @Expose()
  lng!: string;

  @ApiProperty()
  @Expose()
  lat!: string;

  @ApiProperty()
  @Expose()
  isDefault!: boolean;
}

export class AddressPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [AddressItemVo] })
  list!: AddressItemVo[];
}

export class UpsertAddressVo {
  @ApiProperty()
  addressId!: string;
  @ApiProperty()
  isDefault!: boolean;
}

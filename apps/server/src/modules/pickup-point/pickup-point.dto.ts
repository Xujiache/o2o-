import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePickupPointDto {
  @ApiProperty() @IsString() @Length(1, 64) name!: string;
  @ApiProperty() @IsString() @Length(1, 20) phone!: string;
  @ApiProperty() @IsString() province!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() district!: string;
  @ApiProperty() @IsString() @Length(1, 255) address!: string;
  @ApiProperty() @IsNumber() lng!: number;
  @ApiProperty() @IsNumber() lat!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
}

export class UpdatePickupPointDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 64) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 20) phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() province?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() district?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 255) address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lng?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lat?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() status?: number;
}

export class SlotDto {
  @ApiProperty({ description: '当日起始分钟 0-1439' }) @IsInt() @Min(0) @Max(1439) startMinute!: number;
  @ApiProperty({ description: '当日结束分钟 1-1440' }) @IsInt() @Min(1) @Max(1440) endMinute!: number;
  @ApiProperty() @IsInt() @Min(1) capacity!: number;
}

export class BatchConfigSlotsDto {
  @ApiProperty({ description: 'YYYY-MM-DD 起始日' }) @IsDateString() startDate!: string;
  @ApiProperty({ description: '应用天数,1-31' }) @IsInt() @Min(1) @Max(31) days!: number;
  @ApiProperty({ description: '每日时段,1-12 段', type: [SlotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots!: SlotDto[];
  @ApiProperty({ required: false, description: '已存在时段是否覆盖' })
  @IsOptional()
  overwrite?: boolean;
}

export class PickupPointVo {
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty({ nullable: true }) storeId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() province!: string;
  @ApiProperty() city!: string;
  @ApiProperty() district!: string;
  @ApiProperty() address!: string;
  @ApiProperty() lng!: number;
  @ApiProperty() lat!: number;
  @ApiProperty() status!: number;
  @ApiProperty({ required: false, description: '距离米,客户端查询时返回' }) distanceM?: number;
}

export class PickupSlotVo {
  @ApiProperty() slotId!: string;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() slotDate!: string;
  @ApiProperty() startMinute!: number;
  @ApiProperty() endMinute!: number;
  @ApiProperty() capacity!: number;
  @ApiProperty() reserved!: number;
  @ApiProperty() remain!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const BIZ_TYPES = ['takeaway', 'errand'] as const;
export type BizType = (typeof BIZ_TYPES)[number];

export class TaskPoolQueryDto {
  @ApiProperty({ enum: BIZ_TYPES, required: false })
  @IsOptional()
  @IsIn(BIZ_TYPES as readonly string[])
  bizType?: BizType;

  @ApiProperty({ required: false, description: '搜索半径(米)', default: 3000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(20000)
  radius?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class AddressVo {
  @ApiProperty()
  lng!: number;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  text!: string;
}

export class TaskItemVo {
  @ApiProperty()
  taskId!: string;

  @ApiProperty({ enum: BIZ_TYPES })
  bizType!: BizType;

  @ApiProperty({ description: '距离(米)' })
  distance!: number;

  @ApiProperty({ description: '酬劳(分)' })
  reward!: number;

  @ApiProperty({ description: '截止时间(毫秒)' })
  deadline!: number;

  @ApiProperty({ type: AddressVo })
  pickupAddress!: AddressVo;

  @ApiProperty({ type: AddressVo })
  deliveryAddress!: AddressVo;
}

export class TaskPoolVo {
  @ApiProperty({ type: [TaskItemVo] })
  items!: TaskItemVo[];

  @ApiProperty()
  total!: number;
}

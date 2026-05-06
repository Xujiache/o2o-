import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export type OrderBizType = 'FOOD' | 'ERRAND';

export class TimelineItemVo {
  @ApiProperty() at!: number;
  @ApiProperty({ nullable: true }) fromStatus!: string | null;
  @ApiProperty() toStatus!: string;
  @ApiProperty() actor!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

export class CustomerOrderTimelineVo {
  @ApiProperty({ type: [TimelineItemVo] }) timeline!: TimelineItemVo[];
  @ApiProperty() currentStatus!: string;
  @ApiProperty({ type: [String], description: 'stage 11 接入 nextStates' }) availableActions!: string[];
}

export class TimelineParamsDto {
  @ApiProperty({ enum: ['FOOD', 'ERRAND'] })
  @IsIn(['FOOD', 'ERRAND'])
  bizType!: OrderBizType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;
}

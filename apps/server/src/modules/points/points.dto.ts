import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import type {
  PointsRecordBizType,
  PointsRecordChangeType,
  PointsRuleBizType,
  PointsRuleTrigger,
} from '../../database/entities';

export class PointsRecordsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['FOOD', 'ERRAND', 'SYSTEM'] })
  @IsOptional()
  @IsIn(['FOOD', 'ERRAND', 'SYSTEM'])
  bizType?: PointsRecordBizType;
}

export class PointsRulesQueryDto {
  @ApiPropertyOptional({ enum: ['FOOD', 'ERRAND'] })
  @IsOptional()
  @IsIn(['FOOD', 'ERRAND'])
  bizType?: PointsRuleBizType;
}

export class PointsOverviewVo {
  @ApiProperty() customerId!: string;
  @ApiProperty() balance!: number;
  @ApiProperty() totalEarned!: number;
  @ApiProperty() totalUsed!: number;
  @ApiProperty() expiringSoon!: number;
}

export class PointsRuleItemVo {
  @ApiProperty() pointsRuleId!: string;
  @ApiProperty() ruleName!: string;
  @ApiProperty({ enum: ['FOOD', 'ERRAND'] }) bizType!: PointsRuleBizType;
  @ApiProperty({ enum: ['ORDER_PAID', 'ORDER_COMPLETED'] }) triggerEvent!: PointsRuleTrigger;
  @ApiProperty() points!: number;
}

export class PointsRulesVo {
  @ApiProperty({ type: [PointsRuleItemVo] }) items!: PointsRuleItemVo[];
}

export class PointsRecordItemVo {
  @ApiProperty() pointsRecordId!: string;
  @ApiProperty({ enum: ['EARN', 'USE', 'ADJUST', 'EXPIRE'] }) changeType!: PointsRecordChangeType;
  @ApiProperty({ enum: ['FOOD', 'ERRAND', 'SYSTEM'] }) bizType!: PointsRecordBizType;
  @ApiProperty() bizOrderId!: string | null;
  @ApiProperty() points!: number;
  @ApiProperty() balanceAfter!: number | null;
  @ApiProperty() remark!: string | null;
  @ApiProperty() createdAt!: number;
}

export class PointsRecordsVo {
  @ApiProperty({ type: [PointsRecordItemVo] }) items!: PointsRecordItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

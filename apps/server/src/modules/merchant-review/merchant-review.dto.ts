import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ description: '回复内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}

export class ReplyReviewVo {
  @ApiProperty() reviewReplyId!: string;
  @ApiProperty() orderReviewId!: string;
  @ApiProperty() createdAt!: number;
}

export class ReviewListQueryDto {
  @ApiProperty({ enum: ['all', 'unreplied', 'replied'], required: false, default: 'all' })
  @IsOptional()
  @IsIn(['all', 'unreplied', 'replied'])
  filter?: 'all' | 'unreplied' | 'replied';

  @ApiProperty({ minimum: 1, maximum: 5, required: false, description: '按评分筛选(1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ default: 20, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ReviewReplyVo {
  @ApiProperty() reviewReplyId!: string;
  @ApiProperty() content!: string;
  @ApiProperty() createdAt!: number;
}

export class ReviewListItemVo {
  @ApiProperty() orderReviewId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() rating!: number;
  @ApiProperty({ nullable: true }) content!: string | null;
  @ApiProperty({ type: [String], description: 'image presigned urls' }) images!: string[];
  @ApiProperty({ description: '用户脱敏标识(后 4 位 ID)' }) customerLabel!: string;
  @ApiProperty() anonymous!: boolean;
  @ApiProperty() createdAt!: number;
  @ApiProperty({ type: ReviewReplyVo, nullable: true }) reply!: ReviewReplyVo | null;
}

export class ReviewListVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ description: '未回复数(便于角标)' }) unrepliedCount!: number;
  @ApiProperty({ description: '平均评分,无评价为 0' }) avgRating!: string;
  @ApiProperty({ type: [ReviewListItemVo] }) list!: ReviewListItemVo[];
}

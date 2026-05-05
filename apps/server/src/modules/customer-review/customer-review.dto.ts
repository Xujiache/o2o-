import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitReviewDto {
  @ApiProperty({ description: '订单 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: '评分 1-5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ required: false, description: '评价内容' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @ApiProperty({ required: false, type: [String], description: '配图文件 IDs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  imageFileIds?: string[];

  @ApiProperty({ required: false, description: '是否匿名' })
  @IsOptional()
  anonymous?: boolean;
}

export class SubmitReviewVo {
  @ApiProperty() reviewId!: string;
  @ApiProperty() submittedAt!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

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

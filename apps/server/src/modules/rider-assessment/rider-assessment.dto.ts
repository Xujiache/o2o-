import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class AssessmentQueryDto {
  @ApiProperty({ required: false, description: 'YYYYMM,默认本月' })
  @IsOptional()
  @IsInt()
  period?: number;
}

export class AssessmentBadgeVo {
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty() awardedAt!: number;
}

export class AssessmentVo {
  @ApiProperty() period!: number;
  @ApiProperty() onTimeRate!: string;
  @ApiProperty() acceptRate!: string;
  @ApiProperty() complaintRate!: string;
  @ApiProperty() avgRating!: string;
  @ApiProperty({ nullable: true }) rankInCity!: number | null;
  @ApiProperty({ type: [AssessmentBadgeVo] }) badges!: AssessmentBadgeVo[];
}

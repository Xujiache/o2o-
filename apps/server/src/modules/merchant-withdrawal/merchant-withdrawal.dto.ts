import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class WithdrawalListQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class CreateWithdrawalDto {
  @ApiProperty({ description: '提现金额(分)' })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ required: false, description: '收款账户 ID(占位,stage 9 接真账户绑定)' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({ description: '短信验证码 6 位' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  smsCode!: string;
}

export class WithdrawalListItemVo {
  @ApiProperty() withdrawalId!: string;
  @ApiProperty() withdrawalNo!: string;
  @ApiProperty() amountCents!: string;
  @ApiProperty() status!: string;
  @ApiProperty() submittedAt!: number;
  @ApiProperty({ nullable: true }) completedAt!: number | null;
  @ApiProperty({ nullable: true }) failReason!: string | null;
}

export class WithdrawalListVo {
  @ApiProperty({ type: [WithdrawalListItemVo] }) items!: WithdrawalListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class CreateWithdrawalVo {
  @ApiProperty() withdrawalId!: string;
  @ApiProperty() withdrawalNo!: string;
  @ApiProperty() status!: string;
  @ApiProperty() submittedAt!: number;
}

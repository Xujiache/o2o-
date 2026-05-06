import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptTaskDto {
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lng?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() lat?: number;
}

export class ArrivePickupDto {
  @ApiProperty() @IsNumber() lng!: number;
  @ApiProperty() @IsNumber() lat!: number;
}

export class PickupDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() pickupCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() itemCheckResult?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  photos?: string[];
}

export class DeliveredDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() deliveryProof?: string;
  @ApiProperty() @IsNumber() lng!: number;
  @ApiProperty() @IsNumber() lat!: number;
}

export class ExceptionDto {
  @ApiProperty({ enum: ['EXCEPTION', 'LATE', 'COMPLAINT', 'FRAUD'] })
  @IsString()
  @IsIn(['EXCEPTION', 'LATE', 'COMPLAINT', 'FRAUD'])
  exceptionType!: 'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  photos?: string[];

  @ApiProperty() @IsNumber() lng!: number;
  @ApiProperty() @IsNumber() lat!: number;
}

export class RiderTaskDetailVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() dispatchTaskId!: string;
  @ApiProperty() bizType!: 'FOOD' | 'ERRAND';
  @ApiProperty() bizOrderId!: string;
  @ApiProperty({ nullable: true }) bizTaskId!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() acceptedAt!: number;
  @ApiProperty({ nullable: true }) arrivedPickupAt!: number | null;
  @ApiProperty({ nullable: true }) pickedUpAt!: number | null;
  @ApiProperty({ nullable: true }) deliveredAt!: number | null;
  @ApiProperty({ nullable: true }) etaAt!: number | null;
}

export class AcceptTaskVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() bizType!: 'FOOD' | 'ERRAND';
  @ApiProperty() taskStatus!: string;
}

export class ArrivePickupVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() arrivedAt!: number;
}

export class PickupVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() pickedUpAt!: number;
}

export class DeliveredVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() deliveredAt!: number;
}

export class ExceptionVo {
  @ApiProperty() exceptionId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() platformHandleRequired!: boolean;
}

export class RiderTimelineItemVo {
  @ApiProperty() at!: number;
  @ApiProperty({ nullable: true }) fromStatus!: string | null;
  @ApiProperty() toStatus!: string;
  @ApiProperty() actor!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

export class RiderTaskTimelineVo {
  @ApiProperty({ type: [RiderTimelineItemVo] }) timeline!: RiderTimelineItemVo[];
  @ApiProperty() taskStatus!: string;
  @ApiProperty({ enum: ['FOOD', 'ERRAND'] }) orderBizType!: 'FOOD' | 'ERRAND';
  @ApiProperty({ type: [String] }) allowedRiderActions!: string[];
}

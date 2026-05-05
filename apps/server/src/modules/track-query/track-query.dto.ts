import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import type { FoodOrderStatus } from '../../database/entities/food-order.entity';

export class TrackPointVo {
  @ApiProperty() @Expose() lng!: number;
  @ApiProperty() @Expose() lat!: number;
  @ApiProperty() @Expose() ts!: number;
}

export class TrackQueryVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty({ description: '预计送达分钟' }) @Expose() eta!: number;
  @ApiProperty({ required: false, description: '骑手最新位置(real 模式)' })
  @Expose()
  riderLocation?: { lng: number; lat: number; updatedAt: number } | null;
  @ApiProperty({ description: '起点(店铺)' }) @Expose() start!: { lng: number; lat: number };
  @ApiProperty({ description: '终点(用户地址)' }) @Expose() end!: { lng: number; lat: number };
  @ApiProperty({ enum: ['mock', 'real'] }) @Expose() source!: 'mock' | 'real';
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class UpsertCartItemDto {
  @ApiProperty({ description: '店铺 id' })
  @IsString()
  @Length(1, 32)
  storeId!: string;

  @ApiProperty({ description: 'sku id' })
  @IsString()
  @Length(1, 32)
  skuId!: string;

  @ApiProperty({ description: '数量;0=删除该 sku 行;>0=upsert 数量' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CartLineVo {
  @ApiProperty() @Expose() cartItemId!: string;
  @ApiProperty() @Expose() skuId!: string;
  @ApiProperty() @Expose() productId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty() @Expose() specValue!: string;
  @ApiProperty({ description: '单价(分)' }) @Expose() unitPrice!: string;
  @ApiProperty() @Expose() quantity!: number;
  @ApiProperty({ description: '小计(分)' }) @Expose() subTotal!: string;
}

export class CartVo {
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty({ type: [CartLineVo] }) @Expose() items!: CartLineVo[];
  @ApiProperty({ description: '商品总额(分)' }) @Expose() goodsAmount!: string;
  @ApiProperty({ description: '配送费(分),取自 store.deliveryFee' }) @Expose() deliveryFee!: string;
  @ApiProperty({ description: '满减优惠(分),本阶段统一 0' }) @Expose() discountAmount!: string;
  @ApiProperty({ description: '合计(分) = goodsAmount + deliveryFee - discountAmount' }) @Expose() totalAmount!: string;
}

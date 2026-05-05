import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { CartVo, UpsertCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('c/food/cart')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post('items')
  @Idempotent({ scope: 'cart:upsert', ttlSeconds: 60 })
  @Audit({ targetType: 'cart-item' })
  @ApiOperation({ summary: '购物车增删改(quantity=0 删/>0 upsert,UNIQUE customer+store+sku)' })
  @ApiOkResponse({ type: CartVo })
  async upsertItem(@CurrentUser() principal: CurrentPrincipal, @Body() dto: UpsertCartItemDto): Promise<CartVo> {
    return this.service.upsertItem(principal.principalId, dto);
  }
}

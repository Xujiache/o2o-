import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { SubmitReviewDto, SubmitReviewVo } from './customer-review.dto';
import { CustomerReviewService } from './customer-review.service';

@ApiTags('customer-review')
@Controller('c/reviews')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CustomerReviewController {
  constructor(private readonly service: CustomerReviewService) {}

  @Post()
  @Idempotent({ scope: 'review:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'order-review' })
  @ApiOperation({ summary: '用户提交订单评价' })
  @ApiOkResponse({ type: SubmitReviewVo })
  async submit(@CurrentUser() p: CurrentPrincipal, @Body() dto: SubmitReviewDto): Promise<SubmitReviewVo> {
    return this.service.submit(p.principalId, dto);
  }
}

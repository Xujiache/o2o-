import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ReplyReviewDto, ReplyReviewVo } from './merchant-review.dto';
import { MerchantReviewService } from './merchant-review.service';

@ApiTags('merchant-review')
@Controller('m/reviews')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantReviewController {
  constructor(private readonly service: MerchantReviewService) {}

  @Post(':reviewId/reply')
  @Idempotent({ scope: 'review:reply', ttlSeconds: 60 })
  @Audit({ targetType: 'review-reply' })
  @ApiOperation({ summary: '商家回复评价' })
  @ApiOkResponse({ type: ReplyReviewVo })
  async reply(
    @CurrentUser() p: CurrentPrincipal,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ): Promise<ReplyReviewVo> {
    return this.service.reply(p.principalId, reviewId, dto);
  }
}

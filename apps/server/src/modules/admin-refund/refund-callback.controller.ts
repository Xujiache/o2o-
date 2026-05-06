import { BadRequestException, Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

import { AdminRefundService } from './admin-refund.service';

interface RefundCallbackBody {
  providerRefundId: string;
  refundNo: string;
  status: 'SUCCESS' | 'FAILED';
}

@ApiTags('refund-callback')
@Controller('callback/refunds')
export class RefundCallbackController {
  constructor(private readonly service: AdminRefundService) {}

  @Post(':channel')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: '退款回调(stage 10 契约骨架,stage 11 接真 wxpay)' })
  async refundCallback(
    @Param('channel') channel: 'wxpay' | 'alipay',
    @Body() body: RefundCallbackBody,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    if (channel !== 'wxpay' && channel !== 'alipay') {
      throw new BadRequestException({ code: 'INVALID_PARAM', message: 'unsupported channel' });
    }
    return this.service.handleProviderCallback(
      channel,
      body.providerRefundId,
      body.refundNo,
      body.status === 'SUCCESS',
    );
  }
}

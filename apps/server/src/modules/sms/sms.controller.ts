import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { SMS_IDEMPOTENT_SCOPE } from './sms.constants';
import { SendSmsCodeDto, SendSmsCodeVo } from './sms.dto';
import { SmsService } from './sms.service';

@ApiTags('customer-auth')
@Controller('c/auth')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('sms-code')
  @Public()
  @Idempotent({ scope: SMS_IDEMPOTENT_SCOPE, ttlSeconds: 60 })
  @ApiOperation({ summary: '发送短信验证码(用户端登录/实名/敏感操作)' })
  @ApiOkResponse({ type: SendSmsCodeVo })
  async sendCode(
    @Body() dto: SendSmsCodeDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<SendSmsCodeVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.smsService.sendCode(dto.mobile, dto.scene, clientIp);
  }
}

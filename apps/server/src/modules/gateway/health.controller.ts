import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('public')
@Controller('pub/health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: '健康检查' })
  health(): { status: string; uptime: number; timestamp: number } {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
    };
  }
}

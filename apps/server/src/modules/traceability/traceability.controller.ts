import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicTraceVo } from './traceability.dto';
import { TraceabilityService } from './traceability.service';

@ApiTags('traceability-public')
@Controller('pub/trace')
export class TraceabilityPublicController {
  constructor(private readonly service: TraceabilityService) {}

  @Get(':code')
  @ApiOperation({ summary: 'public: scan qrcode to view archive (no auth)' })
  @ApiOkResponse({ type: PublicTraceVo })
  async lookup(@Param('code') code: string): Promise<PublicTraceVo> {
    return this.service.publicLookup(code);
  }
}

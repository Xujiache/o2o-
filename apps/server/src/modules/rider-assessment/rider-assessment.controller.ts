import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { AssessmentQueryDto, AssessmentVo } from './rider-assessment.dto';
import { RiderAssessmentService } from './rider-assessment.service';

@ApiTags('rider-assessment')
@Controller('r/assessment')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderAssessmentController {
  constructor(private readonly service: RiderAssessmentService) {}

  @Get()
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '骑手考核中心' })
  @ApiOkResponse({ type: AssessmentVo })
  async query(@CurrentUser() p: CurrentPrincipal, @Query() q: AssessmentQueryDto): Promise<AssessmentVo> {
    return this.service.query(p.principalId, q);
  }
}

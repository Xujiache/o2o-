import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AnyScopeJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { FileVo, UploadFileDto } from './file.dto';
import { FileService } from './file.service';

@ApiTags('public')
@ApiSecurity('Customer-Token')
@ApiSecurity('Merchant-Token')
@ApiSecurity('Rider-Token')
@ApiSecurity('Admin-Token')
@Controller('pub/files')
@UseGuards(AnyScopeJwtGuard, PermissionGuard)
export class FileController {
  constructor(private readonly service: FileService) {}

  @Post('upload')
  @RequirePermission('principal:file:upload')
  @Audit({ targetType: 'file' })
  @Idempotent({ scope: 'file:upload', ttlSeconds: 24 * 3600 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: '文件上传 — 任一端 Token,bizType 与 scope 自动校验归属' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'bizType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        bizType: { type: 'string', example: 'avatar' },
        contentType: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ type: FileVo })
  async upload(
    @CurrentUser() principal: CurrentPrincipal | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<FileVo> {
    if (!principal) throw new UnauthorizedException('login required');
    return this.service.upload({
      scope: principal.scope,
      principalId: String(principal.principalId),
      bizType: dto.bizType,
      file,
    });
  }
}

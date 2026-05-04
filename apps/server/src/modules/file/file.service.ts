import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FileBizScopeMap, type FileBizTypeValue, type Scope } from '@o2o/contracts';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import type { AppConfig } from '../../config/configuration';
import { FileObject, type FileOwnerType } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import type { FileVo } from './file.dto';

const PRESIGN_TTL_SECONDS = 15 * 60;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileObject) private readonly repo: Repository<FileObject>,
    private readonly integration: IntegrationGatewayService,
    private readonly config: ConfigService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async upload(input: {
    scope: Scope;
    principalId: string;
    bizType: string;
    file: Express.Multer.File;
  }): Promise<FileVo> {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException('file required');
    }
    if (input.file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`file too large(>${MAX_FILE_SIZE} bytes)`);
    }

    const allowedScopes = FileBizScopeMap[input.bizType as FileBizTypeValue];
    if (!allowedScopes) {
      throw new BadRequestException(`unknown bizType: ${input.bizType}`);
    }
    if (!allowedScopes.includes(input.scope)) {
      throw new ForbiddenException(`scope ${input.scope} cannot upload bizType ${input.bizType}`);
    }

    const storage = this.config.get<AppConfig['storage']>('storage');
    if (!storage) throw new Error('storage config missing');

    const fileId = nanoid(24);
    const ext = this.guessExtension(input.file.mimetype, input.file.originalname);
    const date = new Date().toISOString().slice(0, 10);
    const objectKey = `${input.bizType}/${input.scope}/${input.principalId}/${date}/${fileId}${ext}`;

    await this.integration.storage.ensureBucket(storage.bucket);
    const putRes = await this.integration.storage.putObject({
      bucket: storage.bucket,
      key: objectKey,
      body: input.file.buffer,
      contentType: input.file.mimetype,
      size: input.file.size,
      metadata: { 'X-Biz-Type': input.bizType, 'X-Owner-Scope': input.scope },
    });

    const url = await this.integration.storage.getPresignedGetUrl({
      bucket: storage.bucket,
      key: objectKey,
      expiresInSeconds: PRESIGN_TTL_SECONDS,
    });
    const expireAt = Date.now() + PRESIGN_TTL_SECONDS * 1000;

    await this.repo.insert({
      fileId,
      bizType: input.bizType,
      ownerType: input.scope as FileOwnerType,
      ownerId: input.principalId,
      storageProvider: storage.provider,
      bucket: storage.bucket,
      objectKey,
      url,
      contentType: input.file.mimetype,
      size: putRes.size.toString(),
      expireAt: expireAt.toString(),
      createdAt: Date.now().toString(),
    });

    // T24 — 发布 FileUploaded 事件;订阅器异步生成缩略图(占位)
    void this.eventBus
      .publish(
        EventName.FileUploaded,
        { fileId, bizType: input.bizType, ownerType: input.scope, ownerId: input.principalId },
        { bizType: EventName.FileUploaded, bizId: fileId },
      )
      .catch((err) => this.logger.error({ err }, 'file-uploaded event publish failed'));

    return { fileId, url, expireAt, size: putRes.size };
  }

  private guessExtension(mime: string, originalName: string): string {
    const fromName = originalName.match(/\.(\w{1,8})$/);
    if (fromName) return `.${fromName[1]!.toLowerCase()}`;
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mime] ?? '';
  }
}

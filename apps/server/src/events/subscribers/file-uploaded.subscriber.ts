/**
 * FileUploaded 订阅器 — 异步生成缩略图(占位)。
 * 阶段 0 仅日志骨架,实际缩略图工作流(图片解码 / sharp 压缩 / 上传 MinIO) 留给阶段 4+。
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EventName, type FileUploadedPayload } from '../events';

@Injectable()
export class FileUploadedSubscriber {
  private readonly logger = new Logger(FileUploadedSubscriber.name);

  @OnEvent(EventName.FileUploaded)
  async handle(payload: FileUploadedPayload): Promise<void> {
    // TODO: 阶段 4+ 接入 sharp + MinIO 缩略图链路
    this.logger.log(
      `[stub] thumbnail generation queued: fileId=${payload.fileId} bizType=${payload.bizType} ownerType=${payload.ownerType} ownerId=${payload.ownerId}`,
    );
  }
}

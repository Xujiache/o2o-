import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { decryptSecret, encryptSecret, maskSecret } from '../../common/utils/cipher.util';
import { ThirdPartyConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import {
  ThirdPartyConfigItemVo,
  ThirdPartyConfigListVo,
  ThirdPartyConfigMutationVo,
  UpdateThirdPartyConfigDto,
} from './admin-third-party-config.dto';

@Injectable()
export class AdminThirdPartyConfigService {
  constructor(
    @InjectRepository(ThirdPartyConfig) private readonly repo: Repository<ThirdPartyConfig>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async list(): Promise<ThirdPartyConfigListVo> {
    const env = process.env.NODE_ENV ?? 'development';
    const rows = await this.repo.find({ where: { env }, order: { provider: 'ASC' } });
    const list: ThirdPartyConfigItemVo[] = rows.map((r) => this.toItem(r));
    return { list };
  }

  async detail(provider: string): Promise<ThirdPartyConfigItemVo> {
    const env = process.env.NODE_ENV ?? 'development';
    const row = await this.repo.findOne({ where: { provider, env } });
    if (!row) throw new NotFoundException('third-party config not found');
    return this.toItem(row);
  }

  async update(
    provider: string,
    dto: UpdateThirdPartyConfigDto,
    operatorAdminId: string,
  ): Promise<ThirdPartyConfigMutationVo> {
    const env = process.env.NODE_ENV ?? 'development';
    const row = await this.repo.findOne({ where: { provider, env } });
    if (!row) throw new NotFoundException('third-party config not found');

    const changedFields: string[] = [];
    const patch: Partial<ThirdPartyConfig> = {};
    if (dto.secret !== undefined && dto.secret !== '') {
      patch.encryptedSecret = encryptSecret(dto.secret);
      changedFields.push('secret');
    }
    if (dto.status !== undefined && dto.status !== row.status) {
      patch.status = dto.status;
      changedFields.push('status');
    }
    if (changedFields.length === 0) {
      return { provider, changedFields: [], updatedAt: row.updatedAt };
    }
    const now = String(Date.now());
    patch.updatedAt = now;
    await this.repo.update({ id: row.id }, patch);

    await this.eventBus.publish(
      EventName.ThirdPartyConfigChanged,
      {
        provider,
        changedFields,
        operatorAdminId,
        changedAt: Number(now),
      },
      { bizType: 'third-party-config', bizId: row.id },
    );

    return { provider, changedFields, updatedAt: now };
  }

  private toItem(row: ThirdPartyConfig): ThirdPartyConfigItemVo {
    const plain = decryptSecret(row.encryptedSecret ?? '');
    return {
      provider: row.provider,
      env: row.env,
      status: row.status,
      secretMasked: maskSecret(plain),
      lastHealthAt: row.lastHealthAt,
      errorMessage: row.errorMessage,
      updatedAt: row.updatedAt,
    };
  }
}

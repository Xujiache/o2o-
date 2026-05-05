import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { SysConfig } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { SystemConfigItemVo, SystemConfigListVo, SystemConfigMutationVo } from './admin-system-config.dto';

@Injectable()
export class AdminSystemConfigService {
  constructor(
    @InjectRepository(SysConfig) private readonly repo: Repository<SysConfig>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async list(): Promise<SystemConfigListVo> {
    const rows = await this.repo.find({ order: { configKey: 'ASC' } });
    const list: SystemConfigItemVo[] = rows.map((r) => ({
      configKey: r.configKey,
      configValue: r.configValue,
      scope: r.scope,
      description: r.description,
      updatedAt: r.updatedAt,
    }));
    return { list };
  }

  async update(configKey: string, value: string, operatorId: string): Promise<SystemConfigMutationVo> {
    const row = await this.repo.findOne({ where: { configKey } });
    if (!row) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'SYSTEM_CONFIG_KEY_UNKNOWN',
        message: `不允许新增配置:${configKey} 不在 sys_config seed 中`,
      });
    }
    const oldValue = row.configValue;
    if (oldValue === value) {
      return { configKey, configValue: oldValue, updatedAt: row.updatedAt };
    }
    const now = String(Date.now());
    await this.repo.update({ id: row.id }, { configValue: value, updatedAt: now });
    await this.eventBus.publish(
      EventName.ConfigChanged,
      { configKey, oldValue, newValue: value, operator: operatorId },
      { bizType: 'sys-config', bizId: row.id },
    );
    return { configKey, configValue: value, updatedAt: now };
  }
}

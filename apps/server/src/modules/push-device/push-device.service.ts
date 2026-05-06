import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { PushDevice, type PushDevicePrincipalType } from '../../database/entities';

import type { BindPushDeviceDto, BindPushDeviceVo } from './push-device.dto';

@Injectable()
export class PushDeviceService {
  constructor(@InjectRepository(PushDevice) private readonly repo: Repository<PushDevice>) {}

  async bind(principalScope: string, principalId: string, dto: BindPushDeviceDto): Promise<BindPushDeviceVo> {
    if (principalScope !== 'customer' && principalScope !== 'merchant' && principalScope !== 'rider') {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'admin scope cannot bind push device' });
    }
    if (dto.appType !== principalScope) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'appType mismatch with token scope' });
    }
    const principalType = principalScope as PushDevicePrincipalType;
    const now = String(Date.now());
    const enabled = dto.pushEnabled ?? true;

    const existing = await this.repo.findOne({
      where: { deviceToken: dto.deviceToken, principalType },
    });
    if (existing) {
      existing.principalId = principalId;
      existing.platform = dto.platform;
      existing.appType = dto.appType;
      existing.pushEnabled = enabled ? 1 : 0;
      existing.updatedAt = now;
      const saved = await this.repo.save(existing);
      return { bindId: saved.pushDeviceId, enabled };
    }
    const ins = await this.repo.insert({
      deviceToken: dto.deviceToken,
      principalType,
      principalId,
      platform: dto.platform,
      appType: dto.appType,
      pushEnabled: enabled ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    const id = String(ins.identifiers[0]?.pushDeviceId ?? '');
    return { bindId: id, enabled };
  }
}

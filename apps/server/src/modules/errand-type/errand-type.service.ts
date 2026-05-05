import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { ErrandType } from '../../database/entities';
import type { ErrandOrderTypeCode } from '../../database/entities';

import type { ErrandTypeListVo, ErrandTypeVo } from './errand-type.dto';

@Injectable()
export class ErrandTypeService {
  constructor(@InjectRepository(ErrandType) private readonly repo: Repository<ErrandType>) {}

  async list(_cityCode?: string): Promise<ErrandTypeListVo> {
    const rows = await this.repo.createQueryBuilder('t').where('t.enabled = 1').orderBy('t.sort', 'ASC').getMany();
    return { list: rows.map((r) => this.toVo(r)) };
  }

  async findByCode(typeCode: ErrandOrderTypeCode): Promise<ErrandType> {
    const row = await this.repo.findOne({ where: { typeCode } });
    if (!row || row.enabled !== 1) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_TYPE_NOT_FOUND',
        message: `跑腿类型不存在或已停用: ${typeCode}`,
      });
    }
    return row;
  }

  private toVo(r: ErrandType): ErrandTypeVo {
    return {
      typeCode: r.typeCode,
      name: r.name,
      requiredFields: r.requiredFields,
      description: r.description ?? '',
      enabled: r.enabled,
      sort: r.sort,
    };
  }
}

import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';

import { isValidGeoJsonPolygon } from '../../common/utils/geojson.util';
import { CitySite } from '../../database/entities';

import {
  CityItemVo,
  CityListPageVo,
  CityMutationVo,
  CreateCityDto,
  ListCitiesQueryDto,
  UpdateCityDto,
} from './admin-city.dto';

@Injectable()
export class AdminCityService {
  constructor(@InjectRepository(CitySite) private readonly repo: Repository<CitySite>) {}

  async list(query: ListCitiesQueryDto): Promise<CityListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.repo.createQueryBuilder('c');
    if (typeof query.serviceEnabled === 'boolean') {
      qb.andWhere('c.service_enabled = :se', { se: query.serviceEnabled ? 1 : 0 });
    }
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('c.city_code LIKE :kw', { kw: `%${kw}%` }).orWhere('c.city_name LIKE :kw', { kw: `%${kw}%` });
        }),
      );
    }
    qb.orderBy('c.display_order', 'ASC')
      .addOrderBy('c.city_site_id', 'ASC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const list = items.map((c) =>
      plainToInstance(
        CityItemVo,
        {
          cityCode: c.cityCode,
          cityName: c.cityName,
          province: c.province,
          serviceEnabled: c.serviceEnabled === 1,
          serviceArea: c.serviceArea,
          displayOrder: c.displayOrder,
          updatedAt: c.updatedAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async create(dto: CreateCityDto): Promise<CityMutationVo> {
    if (dto.serviceArea !== undefined && dto.serviceArea !== null && !isValidGeoJsonPolygon(dto.serviceArea)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'SERVICE_AREA_INVALID',
        message: 'serviceArea 必须是合法 GeoJSON Polygon',
      });
    }
    const exists = await this.repo.findOne({ where: { cityCode: dto.cityCode } });
    if (exists) {
      throw new ConflictException({
        code: ErrorCode.DUPLICATE_REQUEST,
        message: 'cityCode 已存在',
      });
    }
    const now = String(Date.now());
    const created = this.repo.create({
      cityCode: dto.cityCode,
      cityName: dto.cityName,
      province: dto.province ?? null,
      serviceEnabled: dto.serviceEnabled === false ? 0 : 1,
      serviceArea: (dto.serviceArea as never) ?? null,
      displayOrder: dto.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.save(created);
    return { cityId: saved.citySiteId, cityCode: saved.cityCode, updatedAt: saved.updatedAt };
  }

  async update(cityCode: string, dto: UpdateCityDto): Promise<CityMutationVo> {
    const c = await this.repo.findOne({ where: { cityCode } });
    if (!c) throw new NotFoundException('city not found');
    if (dto.serviceArea !== undefined && dto.serviceArea !== null && !isValidGeoJsonPolygon(dto.serviceArea)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'SERVICE_AREA_INVALID',
        message: 'serviceArea 必须是合法 GeoJSON Polygon',
      });
    }
    const now = String(Date.now());
    const patch: Partial<CitySite> = { updatedAt: now };
    if (dto.cityName !== undefined) patch.cityName = dto.cityName;
    if (dto.province !== undefined) patch.province = dto.province;
    if (dto.serviceEnabled !== undefined) patch.serviceEnabled = dto.serviceEnabled ? 1 : 0;
    if (dto.serviceArea !== undefined) patch.serviceArea = (dto.serviceArea as never) ?? null;
    if (dto.displayOrder !== undefined) patch.displayOrder = dto.displayOrder;
    await this.repo.update({ citySiteId: c.citySiteId }, patch);
    return { cityId: c.citySiteId, cityCode: c.cityCode, updatedAt: now };
  }

  async softDisable(cityCode: string): Promise<CityMutationVo> {
    const c = await this.repo.findOne({ where: { cityCode } });
    if (!c) throw new NotFoundException('city not found');
    const now = String(Date.now());
    await this.repo.update({ citySiteId: c.citySiteId }, { serviceEnabled: 0, updatedAt: now });
    return { cityId: c.citySiteId, cityCode: c.cityCode, updatedAt: now };
  }
}

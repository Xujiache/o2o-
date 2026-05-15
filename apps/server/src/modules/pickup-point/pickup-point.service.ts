import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Brackets, Repository } from 'typeorm';

import { PickupPoint } from '../../database/entities';

import {
  AdminListPickupPointsQueryDto,
  AdminListPickupPointsVo,
  AdminPickupPointVo,
  CreatePickupPointDto,
  PickupPointMutationVo,
  PublicListPickupPointsQueryDto,
  PublicListPickupPointsVo,
  PublicPickupPointVo,
  UpdatePickupPointDto,
} from './pickup-point.dto';

/**
 * 自提点服务(GR-1)
 *
 * 公开端:仅返回 status=active,可按 lng/lat 距离排序(Haversine)。
 * admin 端:CRUD + 软删(status=offline)。
 */
@Injectable()
export class PickupPointService {
  constructor(@InjectRepository(PickupPoint) private readonly repo: Repository<PickupPoint>) {}

  /** ===== public ===== */

  async publicList(query: PublicListPickupPointsQueryDto): Promise<PublicListPickupPointsVo> {
    const limit = query.limit ?? 50;
    const qb = this.repo.createQueryBuilder('pp').where('pp.status = :st', { st: 'active' });
    if (query.cityCode) {
      qb.andWhere('pp.city_code = :cc', { cc: query.cityCode });
    }
    qb.orderBy('pp.updated_at', 'DESC').take(limit);
    const items = await qb.getMany();

    const hasGeo = typeof query.lng === 'number' && typeof query.lat === 'number';
    const withDistance = items.map((p) => {
      const vo = plainToInstance(
        PublicPickupPointVo,
        {
          pickupPointId: p.pickupPointId,
          name: p.name,
          address: p.address,
          cityCode: p.cityCode,
          lng: p.lng,
          lat: p.lat,
          businessHourStart: p.businessHourStart,
          businessHourEnd: p.businessHourEnd,
          contactPhone: p.contactPhone,
          status: p.status,
          notice: p.notice,
        },
        { excludeExtraneousValues: true },
      );
      if (hasGeo) {
        vo.distanceMeters = Math.round(haversine(query.lng!, query.lat!, Number(p.lng), Number(p.lat)));
      }
      return vo;
    });

    if (hasGeo) {
      withDistance.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    }
    return { list: withDistance };
  }

  async publicDetail(pickupPointId: string): Promise<PublicPickupPointVo> {
    const p = await this.repo.findOne({ where: { pickupPointId } });
    if (!p || p.status === 'offline') {
      throw new NotFoundException('pickup point not found');
    }
    return plainToInstance(
      PublicPickupPointVo,
      {
        pickupPointId: p.pickupPointId,
        name: p.name,
        address: p.address,
        cityCode: p.cityCode,
        lng: p.lng,
        lat: p.lat,
        businessHourStart: p.businessHourStart,
        businessHourEnd: p.businessHourEnd,
        contactPhone: p.contactPhone,
        status: p.status,
        notice: p.notice,
      },
      { excludeExtraneousValues: true },
    );
  }

  /** ===== admin ===== */

  async adminList(query: AdminListPickupPointsQueryDto): Promise<AdminListPickupPointsVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.repo.createQueryBuilder('pp');
    if (query.status) {
      qb.andWhere('pp.status = :st', { st: query.status });
    }
    if (query.keyword) {
      const kw = query.keyword.trim();
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('pp.name LIKE :kw', { kw: `%${kw}%` }).orWhere('pp.address LIKE :kw', { kw: `%${kw}%` });
        }),
      );
    }
    qb.orderBy('pp.pickup_point_id', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    const list = items.map((p) =>
      plainToInstance(
        AdminPickupPointVo,
        {
          pickupPointId: p.pickupPointId,
          name: p.name,
          address: p.address,
          cityCode: p.cityCode,
          lng: p.lng,
          lat: p.lat,
          businessHourStart: p.businessHourStart,
          businessHourEnd: p.businessHourEnd,
          contactPhone: p.contactPhone,
          status: p.status,
          notice: p.notice,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        },
        { excludeExtraneousValues: true },
      ),
    );
    return { pageNo, pageSize, total, list };
  }

  async adminCreate(dto: CreatePickupPointDto): Promise<PickupPointMutationVo> {
    const now = String(Date.now());
    const entity = this.repo.create({
      name: dto.name,
      address: dto.address,
      cityCode: dto.cityCode ?? null,
      lng: String(dto.lng),
      lat: String(dto.lat),
      businessHourStart: dto.businessHourStart ?? '09:00',
      businessHourEnd: dto.businessHourEnd ?? '21:00',
      contactPhone: dto.contactPhone ?? null,
      status: dto.status ?? 'active',
      notice: dto.notice ?? null,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.repo.save(entity);
    return { pickupPointId: saved.pickupPointId, updatedAt: saved.updatedAt };
  }

  async adminUpdate(pickupPointId: string, dto: UpdatePickupPointDto): Promise<PickupPointMutationVo> {
    const p = await this.repo.findOne({ where: { pickupPointId } });
    if (!p) throw new NotFoundException('pickup point not found');
    const now = String(Date.now());
    const patch: Partial<PickupPoint> = { updatedAt: now };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.cityCode !== undefined) patch.cityCode = dto.cityCode;
    if (dto.lng !== undefined) patch.lng = String(dto.lng);
    if (dto.lat !== undefined) patch.lat = String(dto.lat);
    if (dto.businessHourStart !== undefined) patch.businessHourStart = dto.businessHourStart;
    if (dto.businessHourEnd !== undefined) patch.businessHourEnd = dto.businessHourEnd;
    if (dto.contactPhone !== undefined) patch.contactPhone = dto.contactPhone;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.notice !== undefined) patch.notice = dto.notice;
    await this.repo.update({ pickupPointId }, patch);
    return { pickupPointId, updatedAt: now };
  }

  async adminSoftDelete(pickupPointId: string): Promise<PickupPointMutationVo> {
    const p = await this.repo.findOne({ where: { pickupPointId } });
    if (!p) throw new NotFoundException('pickup point not found');
    const now = String(Date.now());
    await this.repo.update({ pickupPointId }, { status: 'offline', updatedAt: now });
    return { pickupPointId, updatedAt: now };
  }
}

/** Haversine 距离(米) */
function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

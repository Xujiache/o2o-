import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Between, Repository } from 'typeorm';

import { PickupPoint, PickupTimeSlot } from '../../database/entities';

import type {
  BatchConfigSlotsDto,
  CreatePickupPointDto,
  PickupPointVo,
  PickupSlotVo,
  UpdatePickupPointDto,
} from './pickup-point.dto';

/** 简易 geohash(base32 5字符,~5km 精度);本项目位置敏感不高,够用 */
function geohashEncode(lng: number, lat: number, precision = 8): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90,
    maxLat = 90,
    minLng = -180,
    maxLng = 180;
  let bits = 0,
    bit = 0,
    even = true;
  let hash = '';
  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        minLng = mid;
      } else {
        bits = bits << 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        minLat = mid;
      } else {
        bits = bits << 1;
        maxLat = mid;
      }
    }
    even = !even;
    bit++;
    if (bit === 5) {
      hash += base32[bits];
      bit = 0;
      bits = 0;
    }
  }
  return hash;
}

function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class PickupPointService {
  constructor(
    @InjectRepository(PickupPoint) private readonly repo: Repository<PickupPoint>,
    @InjectRepository(PickupTimeSlot) private readonly slotRepo: Repository<PickupTimeSlot>,
  ) {}

  toVo(p: PickupPoint, distanceM?: number): PickupPointVo {
    return {
      pickupPointId: p.pickupPointId,
      merchantId: p.merchantId,
      storeId: p.storeId,
      name: p.name,
      phone: p.phone,
      province: p.province,
      city: p.city,
      district: p.district,
      address: p.address,
      lng: Number(p.lng),
      lat: Number(p.lat),
      status: p.status,
      ...(distanceM !== undefined ? { distanceM: Math.round(distanceM) } : {}),
    };
  }

  // ============= Merchant CRUD =============

  async createForMerchant(merchantId: string, dto: CreatePickupPointDto): Promise<PickupPointVo> {
    const now = String(Date.now());
    const entity: Partial<PickupPoint> = {
      merchantId,
      storeId: dto.storeId ?? null,
      name: dto.name,
      phone: dto.phone,
      province: dto.province,
      city: dto.city,
      district: dto.district,
      address: dto.address,
      lng: String(dto.lng),
      lat: String(dto.lat),
      geohash: geohashEncode(dto.lng, dto.lat),
      status: 1,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.repo.save(this.repo.create(entity));
    return this.toVo(saved);
  }

  async updateForMerchant(merchantId: string, id: string, dto: UpdatePickupPointDto): Promise<PickupPointVo> {
    const p = await this.repo.findOne({ where: { pickupPointId: id } });
    if (!p) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'pickup point not found' });
    if (p.merchantId !== merchantId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });

    const patch: Partial<PickupPoint> = { updatedAt: String(Date.now()) };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.province !== undefined) patch.province = dto.province;
    if (dto.city !== undefined) patch.city = dto.city;
    if (dto.district !== undefined) patch.district = dto.district;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.lng !== undefined) patch.lng = String(dto.lng);
    if (dto.lat !== undefined) patch.lat = String(dto.lat);
    if (dto.lng !== undefined && dto.lat !== undefined) patch.geohash = geohashEncode(dto.lng, dto.lat);
    if (dto.status !== undefined) patch.status = dto.status;

    await this.repo.update({ pickupPointId: id }, patch);
    const updated = await this.repo.findOne({ where: { pickupPointId: id } });
    return this.toVo(updated!);
  }

  async listForMerchant(merchantId: string): Promise<PickupPointVo[]> {
    const list = await this.repo.find({ where: { merchantId }, order: { createdAt: 'DESC' } });
    return list.map((p) => this.toVo(p));
  }

  // ============= Customer query =============

  async listForCustomer(lng?: number, lat?: number, keyword?: string): Promise<PickupPointVo[]> {
    const qb = this.repo.createQueryBuilder('p').where('p.status = 1');
    if (keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.address LIKE :kw)', { kw: `%${keyword}%` });
    }
    const all = await qb.limit(200).getMany();
    const scored = all.map((p) => {
      const distanceM =
        lng !== undefined && lat !== undefined ? haversineMeters(lng, lat, Number(p.lng), Number(p.lat)) : undefined;
      return { p, distanceM };
    });
    scored.sort((a, b) => (a.distanceM ?? 1e18) - (b.distanceM ?? 1e18));
    return scored.slice(0, 50).map(({ p, distanceM }) => this.toVo(p, distanceM));
  }

  async detail(id: string): Promise<PickupPointVo> {
    const p = await this.repo.findOne({ where: { pickupPointId: id } });
    if (!p) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'pickup point not found' });
    return this.toVo(p);
  }

  // ============= Slot 时段 =============

  async batchConfigSlots(
    merchantId: string,
    pickupPointId: string,
    dto: BatchConfigSlotsDto,
  ): Promise<{ created: number; skipped: number; updated: number }> {
    const p = await this.repo.findOne({ where: { pickupPointId } });
    if (!p) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (p.merchantId !== merchantId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });

    for (const s of dto.slots) {
      if (s.endMinute <= s.startMinute) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: 'slot end must be greater than start',
        });
      }
    }

    let created = 0,
      updated = 0,
      skipped = 0;
    const now = String(Date.now());
    const baseDate = new Date(`${dto.startDate}T00:00:00.000Z`);

    for (let d = 0; d < dto.days; d++) {
      const date = new Date(baseDate.getTime() + d * 86400_000);
      const dateStr = date.toISOString().slice(0, 10);
      for (const s of dto.slots) {
        const existing = await this.slotRepo.findOne({
          where: { pickupPointId, slotDate: dateStr, startMinute: s.startMinute },
        });
        if (existing) {
          if (dto.overwrite) {
            await this.slotRepo.update(
              { slotId: existing.slotId },
              { endMinute: s.endMinute, capacity: s.capacity, updatedAt: now },
            );
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        await this.slotRepo.insert({
          pickupPointId,
          slotDate: dateStr,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          capacity: s.capacity,
          reserved: 0,
          status: 1,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }
    return { created, updated, skipped };
  }

  async listSlotsByDate(pickupPointId: string, date: string): Promise<PickupSlotVo[]> {
    const slots = await this.slotRepo.find({
      where: { pickupPointId, slotDate: date, status: 1 },
      order: { startMinute: 'ASC' },
    });
    return slots.map((s) => ({
      slotId: s.slotId,
      pickupPointId: s.pickupPointId,
      slotDate: s.slotDate,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      capacity: s.capacity,
      reserved: s.reserved,
      remain: Math.max(0, s.capacity - s.reserved),
    }));
  }

  async listSlotsRangeForMerchant(
    merchantId: string,
    pickupPointId: string,
    fromDate: string,
    toDate: string,
  ): Promise<PickupSlotVo[]> {
    const p = await this.repo.findOne({ where: { pickupPointId } });
    if (!p) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (p.merchantId !== merchantId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });
    const slots = await this.slotRepo.find({
      where: { pickupPointId, slotDate: Between(fromDate, toDate) },
      order: { slotDate: 'ASC', startMinute: 'ASC' },
    });
    return slots.map((s) => ({
      slotId: s.slotId,
      pickupPointId: s.pickupPointId,
      slotDate: s.slotDate,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      capacity: s.capacity,
      reserved: s.reserved,
      remain: Math.max(0, s.capacity - s.reserved),
    }));
  }
}

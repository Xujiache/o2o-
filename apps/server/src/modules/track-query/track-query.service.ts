import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { FoodOrder, RiderLocation, Store } from '../../database/entities';

import { type TrackQueryVo } from './track-query.dto';

const REAL_STATUS = new Set(['RIDER_ASSIGNED', 'PICKED_UP', 'DELIVERING']);
const MOCK_DELIVERY_KMH = 30; // 30 km/h

@Injectable()
export class TrackQueryService {
  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(RiderLocation) private readonly locationRepo: Repository<RiderLocation>,
  ) {}

  async getTrack(customerId: string, orderId: string): Promise<TrackQueryVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    const store = await this.storeRepo.findOne({ where: { storeId: order.storeId } });
    const start = { lng: 116.4, lat: 39.9 }; // stage 5 mock,store 表无 lng/lat
    void store;
    const addressSnapshot = order.addressSnapshot ?? { lng: 116.4, lat: 39.95 };
    const end = { lng: addressSnapshot.lng ?? 116.4, lat: addressSnapshot.lat ?? 39.95 };

    let riderLocation: { lng: number; lat: number; updatedAt: number } | null = null;
    let source: 'mock' | 'real' = 'mock';
    if (REAL_STATUS.has(order.status)) {
      // 简化:不知道 riderId(stage 8 admin-rider 派单后写入 food_order),本阶段返 store 起点 mock
      const latest = await this.locationRepo.createQueryBuilder('l').orderBy('l.reported_at', 'DESC').limit(1).getOne();
      if (latest) {
        riderLocation = {
          lng: Number(latest.lng),
          lat: Number(latest.lat),
          updatedAt: Number(latest.reportedAt),
        };
        source = 'real';
      }
    }

    // eta: 直线距离(米) / (km/h * 1000 / 60) 分钟
    const distanceMeters = this.haversine(start, end);
    const eta = Math.ceil(distanceMeters / ((MOCK_DELIVERY_KMH * 1000) / 60));

    return {
      orderId,
      status: order.status,
      eta,
      riderLocation,
      start,
      end,
      source,
    };
  }

  private haversine(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
    const R = 6371000;
    const toRad = (x: number): number => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
    return Math.round(R * c);
  }
}

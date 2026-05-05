import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { RiderAccount, RiderApplication, RiderServiceArea, RiderStatus } from '../../database/entities';
import { EventName, type RiderApprovedPayload } from '../events';

@Injectable()
export class RiderApprovedSubscriber {
  private readonly logger = new Logger(RiderApprovedSubscriber.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @OnEvent(EventName.RiderApproved)
  async handle(payload: RiderApprovedPayload): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const riderRepo = em.getRepository(RiderAccount);
      const appRepo = em.getRepository(RiderApplication);
      const statusRepo = em.getRepository(RiderStatus);
      const areaRepo = em.getRepository(RiderServiceArea);

      const rider = await riderRepo.findOne({ where: { riderId: payload.riderId } });
      if (!rider) {
        throw new Error(`rider ${payload.riderId} not found`);
      }
      // 幂等:approvedAt 已写则跳过
      if (rider.approvedAt) {
        this.logger.warn(`[rider.approved] rider ${payload.riderId} already approved at ${rider.approvedAt}, skip`);
        return;
      }
      const app = await appRepo.findOne({ where: { applicationId: payload.applicationId } });
      if (!app) throw new Error(`application ${payload.applicationId} not found`);

      const now = String(Date.now());

      // 1. 写权威字段
      await riderRepo.update(
        { riderId: rider.riderId },
        {
          realName: app.realName,
          idCardNo: app.idCardNo,
          healthCertNo: app.healthCertNo,
          healthCertExpiry: app.healthCertExpiry,
          approvedAt: now,
          approvedApplicationId: app.applicationId,
          updatedAt: now,
        },
      );

      // 2. 建 rider_status(默认 offline)
      const existingStatus = await statusRepo.findOne({ where: { riderId: rider.riderId } });
      if (!existingStatus) {
        await statusRepo.insert({
          riderId: rider.riderId,
          onlineStatus: 'offline',
          currentLng: null,
          currentLat: null,
          lastHeartbeatAt: null,
          deviceToken: null,
          platform: null,
          creditScore: 100,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 3. 建 rider_service_area(空 Polygon 占位)
      const existingArea = await areaRepo.findOne({ where: { riderId: rider.riderId } });
      if (!existingArea) {
        await areaRepo.insert({
          riderId: rider.riderId,
          geometry: { type: 'Polygon', coordinates: [] },
          maxConcurrentOrders: 3,
          createdAt: now,
          updatedAt: now,
        });
      }

      this.logger.log(
        `[rider.approved] rider ${payload.riderId}: realName/idCard/healthCert 已写入,rider_status + rider_service_area 已建`,
      );
    });
  }
}

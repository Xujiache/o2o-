import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiderAccount, RiderStatus, RiderVehicle } from '../../database/entities';

import { RiderProfileVo, UpdateRiderProfileDto } from './rider-profile.dto';

@Injectable()
export class RiderProfileService {
  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderVehicle) private readonly vehicleRepo: Repository<RiderVehicle>,
  ) {}

  async getProfile(riderId: string): Promise<RiderProfileVo> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');
    const status = await this.statusRepo.findOne({ where: { riderId } });
    const vehicle = await this.vehicleRepo.findOne({ where: { riderId } });
    return {
      riderId: rider.riderId,
      mobile: rider.mobile,
      accountStatus: rider.accountStatus,
      realName: rider.realName,
      healthCertExpiry: rider.healthCertExpiry,
      approvedAt: rider.approvedAt,
      vehicle: vehicle
        ? {
            vehicleType: vehicle.vehicleType,
            plateNo: vehicle.plateNo,
            brand: vehicle.brand,
          }
        : null,
      creditScore: status?.creditScore ?? 100,
      onlineStatus: (status?.onlineStatus as 'online' | 'offline' | 'busy' | undefined) ?? 'offline',
    } as RiderProfileVo;
  }

  async update(riderId: string, dto: UpdateRiderProfileDto): Promise<void> {
    const rider = await this.riderRepo.findOne({ where: { riderId } });
    if (!rider) throw new NotFoundException('rider not found');
    const now = String(Date.now());
    if (dto.vehicle) {
      const existing = await this.vehicleRepo.findOne({ where: { riderId } });
      if (existing) {
        await this.vehicleRepo.update(
          { vehicleId: existing.vehicleId },
          {
            vehicleType: dto.vehicle.vehicleType,
            plateNo: dto.vehicle.plateNo ?? null,
            brand: dto.vehicle.brand ?? null,
            updatedAt: now,
          },
        );
      } else {
        await this.vehicleRepo.insert({
          riderId,
          vehicleType: dto.vehicle.vehicleType,
          plateNo: dto.vehicle.plateNo ?? null,
          brand: dto.vehicle.brand ?? null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}

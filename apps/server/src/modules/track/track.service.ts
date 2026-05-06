import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';

import { TrackPoint } from '../../database/entities';

export interface TrackPointInput {
  riderTaskId: string;
  riderId: string;
  lng: number;
  lat: number;
  accuracy?: number | null;
  speed?: number | null;
  recordedAt: number;
}

@Injectable()
export class TrackService {
  constructor(@InjectRepository(TrackPoint) private readonly trackRepo: Repository<TrackPoint>) {}

  async recordBatch(points: TrackPointInput[]): Promise<number> {
    if (!points.length) return 0;
    const now = Date.now();
    const rows = points.map((p) => ({
      riderTaskId: p.riderTaskId,
      riderId: p.riderId,
      lng: String(p.lng),
      lat: String(p.lat),
      accuracy: p.accuracy ?? null,
      speed: p.speed != null ? String(p.speed) : null,
      recordedAt: String(p.recordedAt),
      createdAt: String(now),
    }));
    await this.trackRepo.insert(rows);
    return rows.length;
  }

  async queryByTaskId(riderTaskId: string, range?: { from?: number; to?: number }): Promise<TrackPoint[]> {
    const where: Record<string, unknown> = { riderTaskId };
    if (range?.from && range?.to) {
      where.recordedAt = Between(String(range.from), String(range.to));
    } else if (range?.from) {
      where.recordedAt = MoreThanOrEqual(String(range.from));
    }
    return this.trackRepo.find({ where, order: { recordedAt: 'ASC' }, take: 5000 });
  }

  async queryByRiderId(riderId: string, since: number): Promise<TrackPoint[]> {
    return this.trackRepo.find({
      where: { riderId, recordedAt: MoreThanOrEqual(String(since)) },
      order: { recordedAt: 'ASC' },
      take: 5000,
    });
  }
}

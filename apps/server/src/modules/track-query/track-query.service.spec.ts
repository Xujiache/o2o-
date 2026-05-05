import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { FoodOrder, RiderLocation, Store } from '../../database/entities';

import { TrackQueryService } from './track-query.service';

describe('TrackQueryService', () => {
  let svc: TrackQueryService;
  let orders: FoodOrder[];
  let locations: RiderLocation[];

  beforeEach(() => {
    orders = [
      {
        foodOrderId: '700001',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        addressSnapshot: { lng: 116.5, lat: 40.0 },
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        customerId: '10001',
        storeId: '20001',
        status: 'DELIVERING',
        addressSnapshot: { lng: 116.5, lat: 40.0 },
      } as unknown as FoodOrder,
    ];
    locations = [
      {
        locationId: '1',
        riderId: '30001',
        lng: '116.45',
        lat: '39.95',
        reportedAt: String(Date.now()),
      } as unknown as RiderLocation,
    ];

    const orderRepo = {
      findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
        Promise.resolve(orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
      ),
    } as unknown as jest.Mocked<Repository<FoodOrder>>;
    const storeRepo = {
      findOne: jest.fn(() => Promise.resolve({ storeId: '20001' } as unknown as Store)),
    } as unknown as jest.Mocked<Repository<Store>>;
    const locationRepo = {
      createQueryBuilder: jest.fn(() => ({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(locations[0] ?? null),
      })),
    } as unknown as jest.Mocked<Repository<RiderLocation>>;

    svc = new TrackQueryService(orderRepo, storeRepo, locationRepo);
  });

  it('非 RIDER_ASSIGNED/PICKED_UP/DELIVERING → source=mock,riderLocation=null', async () => {
    const r = await svc.getTrack('10001', '700001');
    expect(r.source).toBe('mock');
    expect(r.riderLocation).toBeNull();
    expect(r.start).toEqual({ lng: 116.4, lat: 39.9 });
    expect(r.end).toEqual({ lng: 116.5, lat: 40.0 });
    expect(r.eta).toBeGreaterThan(0);
  });

  it('DELIVERING + 有 rider_location → source=real,含 riderLocation', async () => {
    const r = await svc.getTrack('10001', '700002');
    expect(r.source).toBe('real');
    expect(r.riderLocation).toMatchObject({ lng: 116.45, lat: 39.95 });
  });

  it('订单不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.getTrack('10001', '999999')).rejects.toThrow(NotFoundException);
  });

  it('订单不属本人 → DATA_NOT_FOUND', async () => {
    await expect(svc.getTrack('99999', '700001')).rejects.toThrow(NotFoundException);
  });
});

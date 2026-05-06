import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import type {
  DispatchTask,
  ErrandOrder,
  ErrandTask,
  FoodOrder,
  RiderTask,
  RiderViolation,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { DispatchService } from '../dispatch/dispatch.service';

import { RiderTaskService } from './rider-task.service';

interface World {
  tasks: RiderTask[];
  dispatches: DispatchTask[];
  foodOrders: FoodOrder[];
  errandOrders: ErrandOrder[];
  errandTasks: ErrandTask[];
  violations: RiderViolation[];
  events: { name: string; payload: unknown }[];
}

function makeDispatch(overrides: Partial<DispatchTask> = {}): DispatchTask {
  return {
    dispatchTaskId: 'D1',
    bizType: 'FOOD',
    bizOrderId: '510001',
    bizTaskId: null,
    candidateRiderIds: ['30001'],
    acceptedRiderId: null,
    status: 'PENDING',
    retryCount: 0,
    dispatchedAt: '0',
    timeoutAt: '0',
    completedAt: null,
    createdAt: '0',
    updatedAt: '0',
    ...overrides,
  } as DispatchTask;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const taskRepo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.riderTaskId === opt.where.riderTaskId) ?? null),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      if (!row.riderTaskId) {
        const inserted = { ...row, riderTaskId: String(w.tasks.length + 1) };
        w.tasks.push(inserted);
        return inserted;
      }
      const idx = w.tasks.findIndex((t) => t.riderTaskId === row.riderTaskId);
      if (idx >= 0) w.tasks[idx] = row;
      return row;
    }),
  };
  const dispatchRepo: any = {
    findOne: jest.fn(
      async (opt: any) => w.dispatches.find((d) => d.dispatchTaskId === opt.where.dispatchTaskId) ?? null,
    ),
  };
  const foodOrderRepo: any = {
    update: jest.fn(async (where: any, set: any) => {
      const o = w.foodOrders.find((x) => x.foodOrderId === where.foodOrderId);
      if (o) Object.assign(o, set);
    }),
  };
  const errandOrderRepo: any = {
    update: jest.fn(async (where: any, set: any) => {
      const o = w.errandOrders.find((x) => x.errandOrderId === where.errandOrderId);
      if (o) Object.assign(o, set);
    }),
  };
  const errandTaskRepo: any = {
    update: jest.fn(async (where: any, set: any) => {
      const t = w.errandTasks.find((x) => x.errandTaskId === where.errandTaskId);
      if (t) Object.assign(t, set);
    }),
  };
  const violationRepo: any = {
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, riderViolationId: 'V' + (w.violations.length + 1) };
      w.violations.push(inserted);
      return inserted;
    }),
  };
  const dispatchService = {
    markDispatched: jest.fn(async (dispatchTaskId: string, _riderId: string) => {
      const d = w.dispatches.find((x) => x.dispatchTaskId === dispatchTaskId);
      if (d) d.status = 'DISPATCHED';
    }),
  } as unknown as DispatchService;
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const svc = new RiderTaskService(
    taskRepo,
    dispatchRepo,
    foodOrderRepo,
    errandOrderRepo,
    errandTaskRepo,
    violationRepo,
    dispatchService,
    eventBus,
  );
  return { svc };
  /* eslint-enable */
}

describe('RiderTaskService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      tasks: [],
      dispatches: [makeDispatch()],
      foodOrders: [{ foodOrderId: '510001', status: 'READY_FOR_PICKUP' } as FoodOrder],
      errandOrders: [],
      errandTasks: [],
      violations: [],
      events: [],
    };
  });

  describe('accept', () => {
    it('FOOD 派单 → rider_task ASSIGNED + food_order RIDER_ASSIGNED + emit', async () => {
      const { svc } = buildService(w);
      const r = await svc.accept('30001', 'D1', {});
      expect(r.taskStatus).toBe('ASSIGNED');
      expect(w.tasks.length).toBe(1);
      expect(w.foodOrders[0]!.status).toBe('RIDER_ASSIGNED');
      expect(w.events[0]!.name).toBe('domain.rider-task.accepted');
    });

    it('ERRAND 派单 → 同时更新 errand_task + errand_order', async () => {
      w.dispatches = [
        makeDispatch({ dispatchTaskId: 'D2', bizType: 'ERRAND', bizOrderId: '610001', bizTaskId: '600001' }),
      ];
      w.errandOrders = [{ errandOrderId: '610001', status: 'PAID' } as ErrandOrder];
      w.errandTasks = [{ errandTaskId: '600001', status: 'READY_FOR_DISPATCH' } as ErrandTask];
      const { svc } = buildService(w);
      const r = await svc.accept('30001', 'D2', {});
      expect(r.bizType).toBe('ERRAND');
      expect(w.errandOrders[0]!.status).toBe('ASSIGNED');
      expect(w.errandTasks[0]!.status).toBe('ASSIGNED');
    });

    it('dispatch 不存在抛 NotFound', async () => {
      const { svc } = buildService(w);
      await expect(svc.accept('30001', 'D999', {})).rejects.toThrow(NotFoundException);
    });

    it('dispatch 已 DISPATCHED 抛 STATUS_INVALID', async () => {
      w.dispatches[0]!.status = 'DISPATCHED';
      const { svc } = buildService(w);
      await expect(svc.accept('30001', 'D1', {})).rejects.toThrow(UnprocessableEntityException);
    });

    it('rider 不在候选列表抛 FORBIDDEN', async () => {
      const { svc } = buildService(w);
      await expect(svc.accept('99999', 'D1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('arrivePickup', () => {
    it('ASSIGNED → ARRIVED_PICKUP + emit', async () => {
      w.tasks.push({
        riderTaskId: '1',
        dispatchTaskId: 'D1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        status: 'ASSIGNED',
        acceptedAt: '0',
      } as RiderTask);
      const { svc } = buildService(w);
      const r = await svc.arrivePickup('30001', '1', { lng: 116.4, lat: 39.9 });
      expect(r.status).toBe('ARRIVED_PICKUP');
      expect(w.tasks[0]!.status).toBe('ARRIVED_PICKUP');
      expect(w.events[0]!.name).toBe('domain.rider-task.arrived-pickup');
    });

    it('已 PICKED_UP 抛 STATUS_INVALID', async () => {
      w.tasks.push({ riderTaskId: '1', riderId: '30001', status: 'PICKED_UP' } as RiderTask);
      const { svc } = buildService(w);
      await expect(svc.arrivePickup('30001', '1', { lng: 0, lat: 0 })).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('pickup', () => {
    it('ARRIVED_PICKUP → PICKED_UP + food_order PICKED_UP + emit', async () => {
      w.tasks.push({
        riderTaskId: '1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        status: 'ARRIVED_PICKUP',
      } as RiderTask);
      const { svc } = buildService(w);
      const r = await svc.pickup('30001', '1', {});
      expect(r.status).toBe('PICKED_UP');
      expect(w.foodOrders[0]!.status).toBe('PICKED_UP');
      expect(w.events[0]!.name).toBe('domain.rider-task.picked-up');
    });
  });

  describe('delivered', () => {
    it('PICKED_UP → DELIVERED + food_order DELIVERED + emit', async () => {
      w.tasks.push({
        riderTaskId: '1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        status: 'PICKED_UP',
      } as RiderTask);
      const { svc } = buildService(w);
      const r = await svc.delivered('30001', '1', { deliveryProof: 'photo:9001', lng: 116.4, lat: 39.9 });
      expect(r.status).toBe('DELIVERED');
      expect(w.foodOrders[0]!.status).toBe('DELIVERED');
      expect(w.events[0]!.name).toBe('domain.rider-task.delivered');
    });
  });

  describe('exception', () => {
    it('在 ASSIGNED → 创 violation + task EXCEPTION + emit', async () => {
      w.tasks.push({
        riderTaskId: '1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        status: 'ASSIGNED',
      } as RiderTask);
      const { svc } = buildService(w);
      const r = await svc.exception('30001', '1', {
        exceptionType: 'EXCEPTION',
        description: '客户拒收',
        lng: 0,
        lat: 0,
      });
      expect(r.platformHandleRequired).toBe(true);
      expect(w.violations.length).toBe(1);
      expect(w.tasks[0]!.status).toBe('EXCEPTION');
      expect(w.events[0]!.name).toBe('domain.rider-task.exception-reported');
    });

    it('已 DELIVERED 抛 STATUS_INVALID', async () => {
      w.tasks.push({ riderTaskId: '1', riderId: '30001', status: 'DELIVERED' } as RiderTask);
      const { svc } = buildService(w);
      await expect(
        svc.exception('30001', '1', { exceptionType: 'EXCEPTION', description: 'x', lng: 0, lat: 0 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('detail', () => {
    it('返回任务详情', async () => {
      w.tasks.push({
        riderTaskId: '1',
        dispatchTaskId: 'D1',
        riderId: '30001',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        status: 'PICKED_UP',
        acceptedAt: '100',
        arrivedPickupAt: null,
        pickedUpAt: '200',
        deliveredAt: null,
        etaAt: null,
      } as RiderTask);
      const { svc } = buildService(w);
      const r = await svc.detail('30001', '1');
      expect(r.status).toBe('PICKED_UP');
      expect(r.pickedUpAt).toBe(200);
    });

    it('不归属 rider 抛 FORBIDDEN', async () => {
      w.tasks.push({ riderTaskId: '1', riderId: '30001' } as RiderTask);
      const { svc } = buildService(w);
      await expect(svc.detail('99999', '1')).rejects.toThrow(ForbiddenException);
    });

    it('不存在抛 NotFound', async () => {
      const { svc } = buildService(w);
      await expect(svc.detail('30001', '999')).rejects.toThrow(NotFoundException);
    });
  });
});

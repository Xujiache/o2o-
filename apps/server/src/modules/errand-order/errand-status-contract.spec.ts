import { Errand } from '@o2o/contracts';

const { ErrandMainFlow, ErrandNextStates, ErrandOrderStatus } = Errand;

describe('ErrandOrderStatus shared contract', () => {
  it('matches server errand_order.status values', () => {
    expect(Object.values(ErrandOrderStatus)).toEqual([
      'WAIT_PAY',
      'PAID',
      'DISPATCHING',
      'ASSIGNED',
      'PICKED_UP',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('keeps timeline/task-only states out of order status contract', () => {
    expect(Object.values(ErrandOrderStatus)).not.toContain('PRICE_INCREASED');
    expect(Object.values(ErrandOrderStatus)).not.toContain('RIDER_ASSIGNED');
    expect(Object.values(ErrandOrderStatus)).not.toContain('WAIT_CONFIRM');
    expect(Object.values(ErrandOrderStatus)).not.toContain('EXCEPTION');
  });

  it('documents the current main flow and cancel branches', () => {
    expect(ErrandMainFlow).toEqual([
      ErrandOrderStatus.WAIT_PAY,
      ErrandOrderStatus.PAID,
      ErrandOrderStatus.DISPATCHING,
      ErrandOrderStatus.ASSIGNED,
      ErrandOrderStatus.PICKED_UP,
      ErrandOrderStatus.DELIVERED,
      ErrandOrderStatus.COMPLETED,
    ]);
    expect(ErrandNextStates[ErrandOrderStatus.WAIT_PAY]).toEqual([ErrandOrderStatus.PAID, ErrandOrderStatus.CANCELLED]);
    expect(ErrandNextStates[ErrandOrderStatus.COMPLETED]).toEqual([]);
  });
});

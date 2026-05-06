import { describe, expect, it } from 'vitest';

import { labelRiderTaskStatus, nextActionsForRiderTask, STATUS_LABEL_RIDER_TASK } from './rider-task-status';

describe('rider-task-status utils', () => {
  it('字典覆盖 7 状态', () => {
    expect(Object.keys(STATUS_LABEL_RIDER_TASK).length).toBe(7);
  });

  it('labelRiderTaskStatus', () => {
    expect(labelRiderTaskStatus('ASSIGNED')).toBe('已接单');
    expect(labelRiderTaskStatus('PICKED_UP')).toBe('已取货');
    expect(labelRiderTaskStatus('UNKNOWN')).toBe('UNKNOWN');
  });

  it('nextActionsForRiderTask 状态机', () => {
    expect(nextActionsForRiderTask('ASSIGNED')).toEqual(['arrive-pickup', 'exception']);
    expect(nextActionsForRiderTask('ARRIVED_PICKUP')).toEqual(['pickup', 'exception']);
    expect(nextActionsForRiderTask('PICKED_UP')).toEqual(['delivered', 'exception']);
    expect(nextActionsForRiderTask('DELIVERED')).toEqual([]);
    expect(nextActionsForRiderTask('CANCELLED')).toEqual([]);
  });
});

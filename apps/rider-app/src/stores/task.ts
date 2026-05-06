import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
  acceptTask,
  arrivePickup as apiArrivePickup,
  deliveredTask as apiDelivered,
  getTaskDetail,
  pickupTask as apiPickup,
  reportException as apiException,
  type RiderTaskDetailVo,
} from '@/api/rider-tasks';

export const useTaskStore = defineStore('rider-task', () => {
  const current = ref<RiderTaskDetailVo | null>(null);
  const loading = ref(false);

  async function load(taskId: string): Promise<void> {
    loading.value = true;
    try {
      const r = await getTaskDetail(taskId);
      if (r.code === '0' && r.data) current.value = r.data;
    } finally {
      loading.value = false;
    }
  }

  async function accept(dispatchTaskId: string, lng?: number, lat?: number): Promise<boolean> {
    const r = await acceptTask(dispatchTaskId, { lng, lat });
    return r.code === '0';
  }

  async function arrivePickup(taskId: string, lng: number, lat: number): Promise<boolean> {
    const r = await apiArrivePickup(taskId, { lng, lat });
    if (r.code === '0' && current.value) {
      current.value.status = 'ARRIVED_PICKUP';
      current.value.arrivedPickupAt = r.data?.arrivedAt ?? Date.now();
    }
    return r.code === '0';
  }

  async function pickup(
    taskId: string,
    body: { pickupCode?: string; itemCheckResult?: string; photos?: string[] },
  ): Promise<boolean> {
    const r = await apiPickup(taskId, body);
    if (r.code === '0' && current.value) {
      current.value.status = 'PICKED_UP';
      current.value.pickedUpAt = r.data?.pickedUpAt ?? Date.now();
    }
    return r.code === '0';
  }

  async function delivered(
    taskId: string,
    body: { deliveryProof?: string; lng: number; lat: number },
  ): Promise<boolean> {
    const r = await apiDelivered(taskId, body);
    if (r.code === '0' && current.value) {
      current.value.status = 'DELIVERED';
      current.value.deliveredAt = r.data?.deliveredAt ?? Date.now();
    }
    return r.code === '0';
  }

  async function reportException(
    taskId: string,
    body: {
      exceptionType: 'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD';
      description: string;
      photos?: string[];
      lng: number;
      lat: number;
    },
  ): Promise<boolean> {
    const r = await apiException(taskId, body);
    if (r.code === '0' && current.value) current.value.status = 'EXCEPTION';
    return r.code === '0';
  }

  return { current, loading, load, accept, arrivePickup, pickup, delivered, reportException };
});

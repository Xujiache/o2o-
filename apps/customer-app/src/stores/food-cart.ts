/** 跨店切换提示 + 单店购物车持久化 */
import { defineStore } from 'pinia';

import { type CartVo, upsertCartItem } from '@/api/food-cart';

interface State {
  currentStoreId: string | null;
  cart: CartVo | null;
}

export const useFoodCartStore = defineStore('food-cart', {
  state: (): State => ({ currentStoreId: null, cart: null }),
  actions: {
    /** 切换店铺(返 false 表示需要前端提示用户清空当前购物车) */
    canSwitchStore(toStoreId: string): boolean {
      if (!this.currentStoreId) return true;
      if (this.currentStoreId === toStoreId) return true;
      return !this.cart || this.cart.items.length === 0;
    },
    setCurrentStore(storeId: string): void {
      this.currentStoreId = storeId;
    },
    async upsert(storeId: string, skuId: string, quantity: number): Promise<CartVo | null> {
      const r = await upsertCartItem({ storeId, skuId, quantity });
      if (r.code === '0' && r.data) {
        this.cart = r.data;
        this.currentStoreId = storeId;
        return r.data;
      }
      return null;
    },
    clear(): void {
      this.cart = null;
      this.currentStoreId = null;
    },
  },
});

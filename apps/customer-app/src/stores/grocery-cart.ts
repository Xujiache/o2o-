import { defineStore } from 'pinia';

import type { GroceryProductItem, PricingMode, WeightUnit } from '@/api/grocery-products';

const STORAGE_KEY = 'o2o:customer:grocery-cart';

export interface GroceryCartLine {
  productId: string;
  name: string;
  coverImageFileId: string | null;
  pricingMode: PricingMode;
  weightUnit: WeightUnit | null;
  /** fixed: 单价分; weighed: 每斤分 */
  unitPrice: string;
  /** fixed: 份数; weighed: 预估克数 */
  quantity: number;
  minWeightG: number | null;
  maxWeightG: number | null;
  stock: number;
}

interface CartState {
  lines: GroceryCartLine[];
}

function readStorage(): GroceryCartLine[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw as string) as GroceryCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(lines: GroceryCartLine[]): void {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

export const useGroceryCartStore = defineStore('grocery-cart', {
  state: (): CartState => ({ lines: readStorage() }),
  getters: {
    totalCount(state): number {
      return state.lines.length;
    },
    totalPiecesOrWeight(state): number {
      return state.lines.reduce((s, l) => s + l.quantity, 0);
    },
    estimatedAmountCents(state): number {
      return state.lines.reduce((sum, l) => {
        const unit = Number(l.unitPrice);
        if (!Number.isFinite(unit)) return sum;
        if (l.pricingMode === 'fixed') return sum + unit * l.quantity;
        // weighed: unitPrice 元/斤(分) × g / 500
        return sum + Math.round((unit * l.quantity) / 500);
      }, 0);
    },
  },
  actions: {
    persist(): void {
      writeStorage(this.lines);
    },
    addOrUpdate(p: GroceryProductItem, quantity: number): void {
      const idx = this.lines.findIndex((l) => l.productId === p.productId);
      const unitPrice = p.pricingMode === 'weighed' ? (p.unitPricePerJin ?? '0') : p.price;
      const line: GroceryCartLine = {
        productId: p.productId,
        name: p.name,
        coverImageFileId: p.coverImageFileId,
        pricingMode: p.pricingMode,
        weightUnit: p.weightUnit,
        unitPrice,
        quantity,
        minWeightG: p.minWeightG,
        maxWeightG: p.maxWeightG,
        stock: p.stock,
      };
      if (idx >= 0) this.lines[idx] = line;
      else this.lines.push(line);
      this.persist();
    },
    updateQuantity(productId: string, quantity: number): void {
      const idx = this.lines.findIndex((l) => l.productId === productId);
      if (idx < 0) return;
      const line = this.lines[idx];
      if (!line) return;
      if (quantity <= 0) this.lines.splice(idx, 1);
      else line.quantity = quantity;
      this.persist();
    },
    remove(productId: string): void {
      this.lines = this.lines.filter((l) => l.productId !== productId);
      this.persist();
    },
    clear(): void {
      this.lines = [];
      this.persist();
    },
    findLine(productId: string): GroceryCartLine | undefined {
      return this.lines.find((l) => l.productId === productId);
    },
  },
});

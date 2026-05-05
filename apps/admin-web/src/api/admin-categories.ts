import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const CategoryEndpoints = {
  Tree: '/api/v1/admin/categories',
  Detail: (id: string): string => `/api/v1/admin/categories/${id}`,
} as const;

export type CategoryBizType = 'takeaway' | 'errand';

export interface CategoryItemVo {
  categoryId: string;
  bizType: CategoryBizType;
  parentId: string;
  name: string;
  iconUrl?: string | null;
  displayOrder: number;
  enabled: boolean;
  children?: CategoryItemVo[];
}

export interface CategoryTreeVo {
  bizType: CategoryBizType;
  list: CategoryItemVo[];
}

export interface CreateCategoryReq {
  bizType: CategoryBizType;
  parentId?: string;
  name: string;
  iconUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryReq {
  name?: string;
  iconUrl?: string;
  displayOrder?: number;
  enabled?: boolean;
}

export interface CategoryMutationVo {
  categoryId: string;
  updatedAt: string;
}

export function listCategoryTree(bizType: CategoryBizType): Promise<ApiResponse<CategoryTreeVo>> {
  return request<CategoryTreeVo>({ url: CategoryEndpoints.Tree, method: 'GET', params: { bizType } });
}

export function createCategory(body: CreateCategoryReq): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({ url: CategoryEndpoints.Tree, method: 'POST', data: body });
}

export function updateCategory(id: string, body: UpdateCategoryReq): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({
    url: CategoryEndpoints.Detail(id),
    method: 'PATCH' as never,
    data: body as never,
  });
}

export function disableCategory(id: string): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({ url: CategoryEndpoints.Detail(id), method: 'DELETE' });
}

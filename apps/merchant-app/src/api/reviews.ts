import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ReplyReviewVo {
  reviewReplyId: string;
  orderReviewId: string;
  createdAt: number;
}

export interface ReviewReplyVo {
  reviewReplyId: string;
  content: string;
  createdAt: number;
}

export interface ReviewListItemVo {
  orderReviewId: string;
  orderId: string;
  orderNo: string;
  rating: number;
  content: string | null;
  images: string[];
  customerLabel: string;
  anonymous: boolean;
  createdAt: number;
  reply: ReviewReplyVo | null;
}

export interface ReviewListVo {
  pageNo: number;
  pageSize: number;
  total: number;
  unrepliedCount: number;
  avgRating: string;
  list: ReviewListItemVo[];
}

export type ReviewFilter = 'all' | 'unreplied' | 'replied';

export function listReviews(params: {
  filter?: ReviewFilter;
  rating?: number;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<ReviewListVo>> {
  return request<ReviewListVo>({ url: '/api/v1/m/reviews', method: 'GET', params });
}

export function replyReview(reviewId: string, content: string): Promise<ApiResponse<ReplyReviewVo>> {
  return request({
    url: `/api/v1/m/reviews/${reviewId}/reply`,
    method: 'POST',
    data: { content },
  });
}

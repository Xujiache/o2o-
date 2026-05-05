import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface SubmitReviewReq {
  orderId: string;
  rating: number;
  content?: string;
  imageFileIds?: string[];
  anonymous?: boolean;
}

export interface SubmitReviewVo {
  reviewId: string;
  submittedAt: number;
}

export function submitReview(body: SubmitReviewReq): Promise<ApiResponse<SubmitReviewVo>> {
  return request({
    url: `/api/v1/c/reviews`,
    method: 'POST',
    data: body,
  });
}

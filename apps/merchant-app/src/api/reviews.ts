import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ReplyReviewVo {
  reviewReplyId: string;
  orderReviewId: string;
  createdAt: number;
}

export function replyReview(reviewId: string, content: string): Promise<ApiResponse<ReplyReviewVo>> {
  return request({
    url: `/api/v1/m/reviews/${reviewId}/reply`,
    method: 'POST',
    data: { content },
  });
}

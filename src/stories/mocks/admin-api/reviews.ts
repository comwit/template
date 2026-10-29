import type { AdminReviewsAPI } from "@/services/admin/api/reviews";
import { findItem, list, mockApi } from "../runtime";
import { nowLabel, statusLabel } from "../labels";
export const adminReviews = {
  findAll: mockApi<AdminReviewsAPI["findAll"]>((db, filter, page) =>
    list(db.reviews, filter, page),
  ),
  reply: mockApi<AdminReviewsAPI["reply"]>((db, input) => {
    const review = findItem(db.reviews, input.reviewId);
    review.adminReply = input.reply || null;
    review.adminRepliedLabel = input.reply ? nowLabel() : null;
  }),
  setVisibility: mockApi<AdminReviewsAPI["setVisibility"]>((db, input) => {
    const status = input.hidden ? "hidden" : "visible";
    Object.assign(findItem(db.reviews, input.reviewId), {
      status,
      statusLabel: statusLabel(status),
    });
  }),
} satisfies AdminReviewsAPI;

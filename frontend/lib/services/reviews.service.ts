import { api } from '../api/client';
import { mapQuestion, mapReview } from '../api/mappers';
import type { Question, Review } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReviewPage {
  reviews: Review[];
  total: number;
  averageRating: number;
  breakdown: Record<string, number>;
  totalPages: number;
}
export async function getReviews(productId: string, page = 1, limit = 10): Promise<ReviewPage> {
  const r = await api.get<any>(`/customer/products/${productId}/reviews?page=${page}&limit=${limit}`, { revalidate: 120 });
  return {
    reviews: r.data.map((x: any) => mapReview(x, productId)),
    total: r.meta.totalReviews ?? r.meta.total,
    averageRating: Number(r.meta.averageRating ?? 0),
    breakdown: r.meta.ratingBreakdown ?? {},
    totalPages: r.meta.totalPages ?? 1,
  };
}
export async function getQuestions(productId: string): Promise<Question[]> {
  const rows = await api.get<any[]>(`/customer/products/${productId}/questions`, { revalidate: 120 });
  return rows.map((q) => mapQuestion(q, productId));
}
export const createReview = (b: { productId: string; rating: number; title?: string; comment: string }) => api.post('/customer/reviews', b);
export const voteReview = (id: string, isHelpful: boolean) => api.post(`/customer/reviews/${id}/vote`, { isHelpful });
export const askQuestion = (productId: string, question: string) => api.post('/customer/questions', { productId, question });

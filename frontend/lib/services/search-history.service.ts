import { api } from '../api/client';

export interface SearchHistoryItem {
  id: string;
  term: string;
}

export const getSearchHistory = () => api.get<SearchHistoryItem[]>('/customer/search-history', { revalidate: 0 });
export const recordSearch = (term: string) => api.post<SearchHistoryItem[]>('/customer/search-history', { term });
export const removeSearch = (id: string) => api.delete<SearchHistoryItem[]>(`/customer/search-history/${id}`);
export const clearSearchHistory = () => api.delete<SearchHistoryItem[]>('/customer/search-history');

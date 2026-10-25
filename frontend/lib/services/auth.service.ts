import { api, APIError, clearGuestToken, guestToken, tokens, AUTH_CHANGED_EVENT } from '../api/client';
import { clearStoredCoupon } from '../coupon-store';
import { mapUser } from '../api/mappers';
import type { User } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  user: any;
}

function store(res: AuthResponse): User {
  tokens.set(res.accessToken, res.refreshToken, res.userId);
  clearGuestToken(); // the guest cart was moved into the account
  return mapUser(res.user);
}

export async function login(email: string, password: string): Promise<User> {
  return store(await api.post<AuthResponse>('/customer/auth/login', { email, password, guestToken: guestToken() ?? undefined }));
}

export async function register(data: { name: string; email: string; phone?: string; password: string }): Promise<User> {
  return store(await api.post<AuthResponse>('/customer/auth/register', { ...data, phone: data.phone || undefined, guestToken: guestToken() ?? undefined }));
}

export async function logout(): Promise<void> {
  try {
    if (tokens.access) await api.post('/customer/auth/logout');
  } catch {
    /* already gone */
  }
  tokens.clear();
  clearStoredCoupon(); // a coupon belongs to the person who applied it (shared computers)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/**
 * The signed-in customer, or null when there is no valid login.
 * Only a real "not logged in" answer (401/403) returns null — a network or server problem throws,
 * so the caller can keep the saved login and try again instead of logging the person out.
 */
export async function fetchProfile(): Promise<User | null> {
  if (!tokens.access) return null;
  try {
    return mapUser(await api.get<any>('/customer/auth/profile'));
  } catch (e) {
    if (e instanceof APIError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

export async function updateProfile(data: { name?: string; phone?: string }): Promise<User> {
  return mapUser(await api.patch<any>('/customer/auth/profile', data));
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post<{ success: boolean }>('/customer/auth/change-password', { currentPassword, newPassword });

export const forgotPassword = (email: string) => api.post<unknown>('/customer/auth/forgot-password', { email });
export const resetPassword = (token: string, newPassword: string) => api.post<unknown>('/customer/auth/reset-password', { token, newPassword });

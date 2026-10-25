import { api } from "./client";

export interface StorefrontSync {
  configured: boolean;
  /** when the admin last changed something the shop shows */
  lastChange: string | null;
  /** the last time the shop was told, and whether it worked */
  last: { at: string; ok: boolean; tags: string[]; error?: string } | null;
  pending: boolean;
}

export const storefrontApi = {
  sync: () => api.get<StorefrontSync>("/admin/storefront/sync").then((r) => r.data),
  publish: () => api.post<StorefrontSync>("/admin/storefront/sync").then((r) => r.data),
};

import { api } from '../api/client';

export interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  division: string | null;
  district: string | null;
  upazila: string | null;
  city: string | null;
  postalCode: string | null;
  isDefault: boolean;
}
export type AddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  division?: string;
  district?: string;
  upazila?: string;
  city?: string;
  postalCode: string;
  isDefault?: boolean;
};
export const getAddresses = () => api.get<SavedAddress[]>('/customer/addresses');
export const createAddress = (a: AddressInput) => api.post<SavedAddress>('/customer/addresses', a);
export const updateAddress = (id: string, a: Partial<AddressInput>) => api.patch<SavedAddress>(`/customer/addresses/${id}`, a);
export const deleteAddress = (id: string) => api.delete(`/customer/addresses/${id}`);
export const setDefaultAddress = (id: string) => api.patch(`/customer/addresses/${id}/default`);

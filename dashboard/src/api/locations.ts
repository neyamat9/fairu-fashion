import { api } from "./client";

export interface LocDivision { id: string; name: string; bnName: string }
export interface LocDistrict { id: string; divisionId: string; name: string; bnName: string }
export interface LocArea { id: string; name: string; bnName: string; kind: string }

export const locationsApi = {
  divisions: () => api.get<LocDivision[]>("/customer/locations/divisions").then((r) => r.data),
  districts: (division: string) => api.get<LocDistrict[]>(`/customer/locations/divisions/${division}/districts`).then((r) => r.data),
  areas: (district: string) => api.get<LocArea[]>(`/customer/locations/districts/${district}/upazilas`).then((r) => r.data),
};

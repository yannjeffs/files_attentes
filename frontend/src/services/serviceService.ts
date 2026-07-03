import type { Service } from "../@types";
import api from "./api";

export const serviceService = {
  getAll: async (agencyId: number): Promise<Service[]> => {
    const response = await api.get<Service[]>(`services?agencyId=${agencyId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Service> => {
    const response = await api.get<Service>(`services/${id}`);
    return response.data;
  },

  create: async (data: object): Promise<Service> => {
    const response = await api.post<Service>("/services", data);
    return response.data;
  },

  update: async (id: number, data: object): Promise<Service> => {
    const response = await api.put<Service>(`/services/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete<Service>(`/services/${id}`);
  },
};

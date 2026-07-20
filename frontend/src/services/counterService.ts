import type { Counter } from "../@types";
import api from "./api";

// Version compacte d'un guichet — utilisée pour les listes
// de guichets liés à un service (GET /services/{id}/counters)
export interface CounterMini {
  id: number;
  number: number;
  name: string;
  isActive: boolean;
}

export const counterService = {
  getAll: async (agencyId: number): Promise<Counter[]> => {
    const res = await api.get<Counter[]>(`/counters?agencyId=${agencyId}`);
    return res.data;
  },

  create: async (data: object): Promise<Counter> => {
    const res = await api.post<Counter>("/counters", data);
    return res.data;
  },

  update: async (id: number, data: object): Promise<Counter> => {
    const res = await api.put<Counter>(`/counters/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/counters/${id}`);
  },

  // ── Liaison Service ↔ Guichet ──────────────────────────────────

  // Liste des guichets assignés à un service
  getByService: async (serviceId: number): Promise<CounterMini[]> => {
    const res = await api.get<CounterMini[]>(`/services/${serviceId}/counters`);
    return res.data;
  },

  // Assigner un guichet à un service
  assignToService: async (serviceId: number, counterId: number): Promise<void> => {
    await api.post(`/services/${serviceId}/counters/${counterId}`);
  },

  // Désassigner un guichet d'un service
  unassignFromService: async (serviceId: number, counterId: number): Promise<void> => {
    await api.delete(`/services/${serviceId}/counters/${counterId}`);
  },
};
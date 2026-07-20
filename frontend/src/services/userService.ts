import api from "./api";

export interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "Admin" | "Agent";
  isActive: boolean;
  agencyId: number;
  createdAt: string;
  // ← Guichet assigné (nullable — un agent peut ne pas en avoir)
  counterId?: number | null;
  counterName?: string | null;
  counterNumber?: number | null;
  // Service géré via le guichet assigné
  serviceId?: number | null;
}

export interface AgentCreateDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  agencyId: number;
  counterId?: number | null;
}

export interface AgentUpdateDto {
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export const userService = {
  getAll: async (agencyId: number): Promise<Agent[]> => {
    const res = await api.get<Agent[]>(`/users?agencyId=${agencyId}`);
    return res.data;
  },

  create: async (data: AgentCreateDto): Promise<void> => {
    await api.post("/auth/register", data);
  },

  update: async (id: number, data: AgentUpdateDto): Promise<Agent> => {
    const res = await api.put<Agent>(`/users/${id}`, data);
    return res.data;
  },

  toggleActive: async (id: number, isActive: boolean): Promise<Agent> => {
    const res = await api.put<Agent>(`/users/${id}/toggle-active`, {
      isActive,
    });
    return res.data;
  },

  // Assigner ou désassigner un guichet à un agent
  assignCounter: async (
    id: number,
    counterId: number | null,
  ): Promise<{ message: string; id: number; counterId: number | null }> => {
    const res = await api.put(`/users/${id}/assign-counter`, { counterId });
    return res.data;
  },
};
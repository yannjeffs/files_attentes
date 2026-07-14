import type { DashboardStats } from "../@types";
import api from "./api";

export interface TicketByDay {
  date: number;
  total: number;
  noShow: number;
  served: number;
}

export const statsService = {
  getDashboard: async (agencyId: number): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>(
      `/stats/dashboard?agencyId=${agencyId}`,
    );
    return response.data;
  },

  getTicketsByDay: async (agencyId: number, days: number = 7): Promise<TicketByDay[]> => {
    const response = await api.get<TicketByDay[]>(`/stats/tickets-by-day?agencyId=${agencyId}&days=${days}`);
    return response.data;
  }

  
};

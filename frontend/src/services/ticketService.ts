import type { Ticket, TicketCreateRequest, TicketPosition, TicketUpdateClientRequest } from "../@types";
import api from "./api";

export const ticketService = {
  create: async (data: TicketCreateRequest): Promise<Ticket> => {
    const response = await api.post<Ticket>("/tickets", data);
    return response.data;
  },

  getById: async (id: number): Promise<Ticket> => {
    const response = await api.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  getQueue: async (serviceId: number): Promise<Ticket[]> => {
    const response = await api.get<Ticket[]>(`tickets/queue/${serviceId}`);
    return response.data;
  },

  call: async (id: number): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/tickets/${id}/call`);
    return response.data;
  },

  start: async (id: number): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/tickets/${id}/start`);
    return response.data;
  },

  complete: async (id: number): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/tickets/${id}/complete`);
    return response.data;
  },

  noShow: async (id: number): Promise<Ticket> => {
    const response = await api.put<Ticket>(`tickets/${id}/noshow`);
    return response.data;
  },

  cancel: async (id: number): Promise<Ticket> => {
    const response = await api.put<Ticket>(`tickets/${id}/cancel`);
    return response.data;
  },

  transfer: async (id: number, newServiceId: number): Promise<void> => {
    await api.put(`tickets/${id}/transfer`, { newServiceId });
  },

  getPosition: async(id: number): Promise<TicketPosition> => {
    const response = await api.get<TicketPosition>(`/tickets/${id}/position`);
    return response.data;
  },

  // Modifier les infos de contact du client
  updateClient: async (
    id: number,
    data: TicketUpdateClientRequest
  ): Promise<Ticket> => {
    const response = await api.put<Ticket>(`/tickets/${id}/update-client`, data);
    return response.data;
  }
};

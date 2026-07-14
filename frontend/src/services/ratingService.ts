import api from "./api";

export interface RatingCreateRequest {
  score: number;
  comment?: string;
}

export interface RatingResponse {
  id: number;
  ticketId: number;
  ticketNumber: string;
  serviceName: string;
  clientName: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export const ratingService = {
  // créer une notation
  create: async (
    ticketId: number,
    data: RatingCreateRequest,
  ): Promise<RatingResponse> => {
    const response = await api.post<RatingResponse>(
      `/ratings/${ticketId}`,
      data,
    );
    return response.data;
  },

  // vérifier si un ticket a déjà été noté
  getByTicket: async (ticketId: number): Promise<RatingResponse | null> => {
    try {
      const response = await api.get<RatingResponse>(
        `/ratings/ticket/${ticketId}`,
      );
      return response.data;
    } catch {
      // 404 - pas encore noté, c'est normal
      return null;
    }
  },
};

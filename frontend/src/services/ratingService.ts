import api from "./api";
import type { RatingListResponse, ScoreDistribution } from "../@types";

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

export interface RatingListParams {
  agencyId: number;
  page?: number;
  pageSize?: number;
  serviceId?: number;
  score?: number;
}

export interface RatingStats {
  totalRatings: number;
  averageScore: number;
  distribution: ScoreDistribution;
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

  // liste paginée et filtrable — admin uniquement
  getAll: async ({
    agencyId,
    page = 1,
    pageSize = 10,
    serviceId,
    score,
  }: RatingListParams): Promise<RatingListResponse> => {
    const params = new URLSearchParams({
      agencyId: String(agencyId),
      page: String(page),
      pageSize: String(pageSize),
    });
    if (serviceId) params.append("serviceId", String(serviceId));
    if (score) params.append("score", String(score));

    const response = await api.get<RatingListResponse>(
      `/ratings?${params.toString()}`,
    );
    return response.data;
  },

  // statistiques de satisfaction seules — admin uniquement
  getStats: async (agencyId: number): Promise<RatingStats> => {
    const response = await api.get<RatingStats>(
      `/ratings/stats?agencyId=${agencyId}`,
    );
    return response.data;
  },
};
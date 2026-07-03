import type { AuthResponse, LoginRequest } from "../@types";
import api from "./api";

export const authService = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', data);
        return response.data;
    },

    register: async(data: object): Promise<void> => {
        await api.post<AuthResponse>("/auth/register", data);
    }
}
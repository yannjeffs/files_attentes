import { persist } from "zustand/middleware";
import type { User } from "../@types";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem("qora_token", token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("qora_token");
        localStorage.removeItem("qora_user");
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "qora_auth",
    },
  ),
);

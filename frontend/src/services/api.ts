import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5180/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur - ajoute le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qora_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur - redirige vers le login le token a expiré
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("qora_token");
      localStorage.removeUser("qora_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

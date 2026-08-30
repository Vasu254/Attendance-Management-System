import axios from "axios";

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (typeof window === "undefined") return "http://localhost:5000/api";

  const hostname = window.location.hostname || "localhost";
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  },
);

export default api;

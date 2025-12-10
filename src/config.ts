// src/config.ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const config = {
  apiBaseUrl: API_BASE_URL,
};
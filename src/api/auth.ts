// src/api/auth.ts
import { apiPost } from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", body);
}
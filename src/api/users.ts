// src/api/users.ts
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";


export type UserRole = "OPERATOR" | "ADMIN" | "SUPERADMIN" | string;

export interface UserEntity {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_superuser: boolean;
  chatwoot_agent_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  role?: UserRole;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UpdateUserInput {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  is_superuser?: boolean;
  chatwoot_agent_id?: number | null;
}

export const listUsers = (params?: { skip?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet<UserEntity[]>(`/users/${suffix}`);
};

export const createUser = (input: CreateUserInput) =>
  apiPost<UserEntity>("/users/", {
    role: "OPERATOR",
    is_active: true,
    is_superuser: false,
    ...input,
  });

export const updateUser = (id: number, patch: UpdateUserInput) =>
  apiPatch<UserEntity>(`/users/${id}`, patch);

export const deleteUser = (id: number) => apiDelete(`/users/${id}`);


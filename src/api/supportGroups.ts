// src/api/supportGroups.ts
import { apiDelete, apiGet, apiPost, apiPut } from "./client";


export interface UserShort {
  id: number;
  full_name: string;
  email: string;
}

export interface SupportGroupEntity {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  default_sla_minutes?: number | null;
  chatwoot_inbox_identifier?: string | null;
  chatwoot_team_id?: number | null;
  members: UserShort[];
}

export interface CreateSupportGroupInput {
  name: string;
  description?: string | null;
  is_active?: boolean;
  default_sla_minutes?: number | null;
  chatwoot_inbox_identifier?: string | null;
  chatwoot_team_id?: number | null;
  member_ids?: number[];
}

export interface UpdateSupportGroupInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  default_sla_minutes?: number | null;
  chatwoot_inbox_identifier?: string | null;
  chatwoot_team_id?: number | null;
  member_ids?: number[] | null;
}

export const listSupportGroups = () =>
  apiGet<SupportGroupEntity[]>("/support-groups/");

export const createSupportGroup = (input: CreateSupportGroupInput) =>
  apiPost<SupportGroupEntity>("/support-groups/", {
    is_active: true,
    member_ids: [],
    ...input,
  });

export const updateSupportGroup = (
  groupId: number,
  input: UpdateSupportGroupInput
) => apiPut<SupportGroupEntity>(`/support-groups/${groupId}`, input);

export const deleteSupportGroup = (id: number) =>
    apiDelete(`/support-groups/${id}`);
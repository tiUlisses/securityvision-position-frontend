// src/api/incidents.ts
import { apiGet, apiPatch, apiPost, apiUploadForm } from "./client";
import type { Incident, IncidentMessage, IncidentSeverity } from "./types";

export interface CreateIncidentFromEventInput {
  device_event_id: number;
  severity?: IncidentSeverity;
  title?: string;
  description?: string;

  // ✅ NOVO
  assigned_group_id?: number;

  // opcional (já vamos preencher via grupo)
  sla_minutes?: number;
  tenant?: string;
}

export async function createIncidentFromEvent(
  payload: CreateIncidentFromEventInput
): Promise<Incident> {
  return apiPost<Incident>("/incidents/from-event", payload);
}

export async function fetchIncidents(params?: {
  only_open?: boolean;
  device_id?: number;
  skip?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.only_open) query.set("only_open", "true");
  if (params?.device_id != null) query.set("device_id", String(params.device_id));
  if (params?.skip != null) query.set("skip", String(params.skip));
  if (params?.limit != null) query.set("limit", String(params.limit));

  const qs = query.toString();
  const url = qs ? `/incidents?${qs}` : "/incidents";
  return apiGet<Incident[]>(url);
}

// ✅ NOVO: incidentes visíveis para o usuário logado
export async function fetchMyIncidents(params?: {
  only_open?: boolean;
  skip?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.only_open) query.set("only_open", "true");
  if (params?.skip != null) query.set("skip", String(params.skip));
  if (params?.limit != null) query.set("limit", String(params.limit));

  const qs = query.toString();
  const url = qs ? `/incidents/my?${qs}` : "/incidents/my";
  return apiGet<Incident[]>(url);
}

export async function updateIncident(
  incidentId: number,
  body: Partial<Pick<Incident, "status" | "severity" | "title" | "description">>
) {
  return apiPatch<Incident>(`/incidents/${incidentId}`, body);
}

// mensagens da timeline
export async function fetchIncidentMessages(
  incidentId: number,
  params?: { after_id?: number; limit?: number }
) {
  const qs = new URLSearchParams();
  if (params?.after_id != null) qs.set("after_id", String(params.after_id));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet<IncidentMessage[]>(`/incidents/${incidentId}/messages${suffix}`);
}
export async function createIncidentMessage(incidentId: number, content: string) {
  return apiPost<IncidentMessage>(`/incidents/${incidentId}/messages`, {
    message_type: "COMMENT",
    content,
  });
}

export async function uploadIncidentAttachment(
  incidentId: number,
  file: File,
  description?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  if (description && description.trim()) {
    formData.append("description", description.trim());
  }
  return apiUploadForm<IncidentMessage>(`/incidents/${incidentId}/attachments`, formData);
}

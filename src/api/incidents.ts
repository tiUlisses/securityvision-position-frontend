// src/api/incidents.ts
import { apiGet, apiPost, apiPatch, apiUploadForm } from "./client";
import type { Incident, IncidentMessage } from "./types";



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

  return apiUploadForm<IncidentMessage>(
    `/incidents/${incidentId}/attachments`,
    formData
  );
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

export async function updateIncident(
  incidentId: number,
  body: Partial<
    Pick<Incident, "status" | "severity" | "title" | "description">
  >
) {
  return apiPatch<Incident>(`/incidents/${incidentId}`, body);
}

// 🔹 mensagens da timeline

export async function fetchIncidentMessages(incidentId: number) {
  return apiGet<IncidentMessage[]>(`/incidents/${incidentId}/messages`);
}

export async function createIncidentMessage(
  incidentId: number,
  content: string
) {
  const body = {
    message_type: "TEXT",
    content,
  };
  return apiPost<IncidentMessage>(
    `/incidents/${incidentId}/messages`,
    body
  ); 


  }

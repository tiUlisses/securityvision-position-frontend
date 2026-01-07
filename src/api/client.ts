// src/api/client.ts

const RAW_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000/api/v1";

// remove barra final
let API_BASE_URL = RAW_BASE.replace(/\/$/, "");

// garante que termina com /api/v1
if (!API_BASE_URL.endsWith("/api/v1")) {
  API_BASE_URL = `${API_BASE_URL}/api/v1`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("svpos_token");
      window.dispatchEvent(new Event("svpos:unauthorized"));
    }

    let message = res.statusText || "Erro na API";

    try {
      const data = await res.clone().json();
      if (data && typeof data === "object" && "detail" in data) {
        const detail: any = (data as any).detail;
        message = typeof detail === "string" ? detail : JSON.stringify(detail);
      } else {
        message = JSON.stringify(data);
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

function buildHeaders(isFormData?: boolean): HeadersInit {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Inclui o token, caso esteja disponível
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("svpos_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: any,
  options?: { isFormData?: boolean }
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const isFormData = options?.isFormData ?? false;

  const init: RequestInit = {
    method,
    headers: buildHeaders(isFormData),
  };

  if (body !== undefined) {
    if (isFormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
    }
  }

  const resp = await fetch(url, init);

  return handleResponse<T>(resp);
}

export const apiGet = <T>(path: string): Promise<T> =>
  request<T>("GET", path);

export const apiPost = <T>(path: string, data: any): Promise<T> =>
  request<T>("POST", path, data);

export const apiPut = <T>(path: string, data: any): Promise<T> =>
  request<T>("PUT", path, data);

export const apiPatch = <T>(path: string, data: any): Promise<T> =>
  request<T>("PATCH", path, data);

export const apiDelete = (path: string): Promise<void> =>
  request<void>("DELETE", path);

export const apiUpload = <T>(path: string, file: File): Promise<T> => {
  const formData = new FormData();
  formData.append("file", file);

  return request<T>("POST", path, formData, { isFormData: true });
};

export const apiUploadForm = <T>(path: string, formData: FormData): Promise<T> =>
  request<T>("POST", path, formData, { isFormData: true });

export const startCameraStream = (cameraId: number): Promise<void> =>
  apiPost<void>(`/devices/cameras/${cameraId}/stream/start`, {});

export const stopCameraStream = (cameraId: number): Promise<void> =>
  apiPost<void>(`/devices/cameras/${cameraId}/stream/stop`, {});

// Exporta o API_BASE_URL corretamente
export { API_BASE_URL };

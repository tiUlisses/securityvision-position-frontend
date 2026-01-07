import { apiPost } from "../api/client";

export const startUplink = (cameraId: number): Promise<void> =>
  apiPost(`/devices/cameras/${cameraId}/uplink/start`, {});

export const stopUplink = (cameraId: number): Promise<void> =>
  apiPost(`/devices/cameras/${cameraId}/uplink/stop`, {});

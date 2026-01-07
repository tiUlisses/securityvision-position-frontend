import type { Device } from "../api/types";
import { ensureMqttConnection } from "../services/mqttClient";

const DEFAULT_TTL_SECONDS = 3000;
const DEFAULT_CENTRAL_SRT_PORT = 8890;

const normalizePathSegment = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const resolveCameraId = (camera: Device, proxyPath?: string | null): string => {
  const candidate =
    normalizePathSegment((camera as any).code) ||
    normalizePathSegment(camera.name) ||
    (proxyPath ? proxyPath.split("/").pop() : null) ||
    String(camera.id);

  return candidate;
};

type CameraUplinkAction = "start" | "stop";

type CameraUplinkPayload = {
  cameraId: string;
  proxyPath: string;
  centralPath: string;
  centralHost: string;
  centralSrtPort: number;
  ttlSeconds: number;
};

const publishMqttMessage = async (
  topic: string,
  payload: CameraUplinkPayload
): Promise<void> => {
  const client = await ensureMqttConnection();
  const message = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    client.publish(topic, message, { qos: 0 }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

export const publishCameraUplinkCommand = (
  camera: Device,
  action: CameraUplinkAction,
  options?: { ttlSeconds?: number; centralSrtPort?: number }
): Promise<void> => {
  const centralHost = normalizePathSegment(camera.central_media_mtx_ip);
  if (!centralHost) {
    return Promise.reject(
      new Error("Câmera sem MediaMTX central cadastrado.")
    );
  }

  const proxyPath = normalizePathSegment(camera.proxy_path);
  const centralPath =
    normalizePathSegment(camera.central_path) || proxyPath;

  if (!proxyPath || !centralPath) {
    return Promise.reject(
      new Error("Câmera sem caminhos proxy/central configurados.")
    );
  }

  const cameraId = resolveCameraId(camera, proxyPath);
  const normalizedProxyPath = proxyPath.replace(/^\/+|\/+$/g, "");

  const payload: CameraUplinkPayload = {
    cameraId,
    proxyPath,
    centralPath,
    centralHost,
    centralSrtPort: options?.centralSrtPort ?? DEFAULT_CENTRAL_SRT_PORT,
    ttlSeconds: options?.ttlSeconds ?? DEFAULT_TTL_SECONDS,
  };

  const topic = `security-vision/cameras/${normalizedProxyPath}/uplink/${action}`;

  return publishMqttMessage(topic, payload);
};

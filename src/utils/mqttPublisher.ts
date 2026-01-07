import type { Device } from "../api/types";

const MQTT_BROKER_URL =
  (import.meta.env.VITE_MQTT_BROKER_URL as string | undefined) ??
  "ws://localhost:1883";

const DEFAULT_TTL_SECONDS = 3000;
const DEFAULT_CENTRAL_SRT_PORT = 8890;
const CONNECTION_TIMEOUT_MS = 5000;
const KEEP_ALIVE_SECONDS = 60;

const encoder = new TextEncoder();

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

const encodeString = (value: string): Uint8Array => {
  const bytes = encoder.encode(value);
  const length = bytes.length;
  const buffer = new Uint8Array(2 + length);
  buffer[0] = (length >> 8) & 0xff;
  buffer[1] = length & 0xff;
  buffer.set(bytes, 2);
  return buffer;
};

const encodeRemainingLength = (length: number): Uint8Array => {
  const bytes: number[] = [];
  let x = length;
  do {
    let digit = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) digit |= 0x80;
    bytes.push(digit);
  } while (x > 0);
  return Uint8Array.from(bytes);
};

const concatBytes = (...chunks: Uint8Array[]): Uint8Array => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    buffer.set(chunk, offset);
    offset += chunk.length;
  });
  return buffer;
};

const buildConnectPacket = (clientId: string): Uint8Array => {
  const protocolName = encodeString("MQTT");
  const protocolLevel = Uint8Array.from([0x04]);
  const connectFlags = Uint8Array.from([0x02]);
  const keepAlive = Uint8Array.from([
    (KEEP_ALIVE_SECONDS >> 8) & 0xff,
    KEEP_ALIVE_SECONDS & 0xff,
  ]);

  const variableHeader = concatBytes(
    protocolName,
    protocolLevel,
    connectFlags,
    keepAlive
  );
  const payload = encodeString(clientId);
  const body = concatBytes(variableHeader, payload);

  return concatBytes(
    Uint8Array.from([0x10]),
    encodeRemainingLength(body.length),
    body
  );
};

const buildPublishPacket = (topic: string, message: string): Uint8Array => {
  const topicBytes = encodeString(topic);
  const payload = encoder.encode(message);
  const body = concatBytes(topicBytes, payload);

  return concatBytes(
    Uint8Array.from([0x30]),
    encodeRemainingLength(body.length),
    body
  );
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

const publishMqttMessage = (topic: string, payload: CameraUplinkPayload): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let connected = false;

    const finalize = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    const clientId = `svpos-${Math.random().toString(16).slice(2)}`;
    const ws = new WebSocket(MQTT_BROKER_URL, "mqtt");
    ws.binaryType = "arraybuffer";

    const timeoutId = window.setTimeout(() => {
      ws.close();
      finalize(new Error("Timeout ao publicar comando MQTT."));
    }, CONNECTION_TIMEOUT_MS);

    ws.onopen = () => {
      ws.send(buildConnectPacket(clientId));
    };

    ws.onerror = () => {
      window.clearTimeout(timeoutId);
      finalize(new Error("Erro ao conectar no broker MQTT."));
    };

    ws.onmessage = (event) => {
      const buffer = event.data instanceof ArrayBuffer
        ? new Uint8Array(event.data)
        : new Uint8Array();

      if (!connected) {
        if (buffer.length < 4 || buffer[0] !== 0x20 || buffer[3] !== 0x00) {
          window.clearTimeout(timeoutId);
          ws.close();
          finalize(new Error("Falha ao autenticar no broker MQTT."));
          return;
        }
        connected = true;
        const message = JSON.stringify(payload);
        ws.send(buildPublishPacket(topic, message));
        window.clearTimeout(timeoutId);
        ws.close();
        finalize();
      }
    };
  });

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

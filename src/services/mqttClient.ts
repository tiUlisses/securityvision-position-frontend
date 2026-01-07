// src/services/mqttClient.ts
import { connect, type IClientOptions, type MqttClient } from "mqtt";
import { useSyncExternalStore } from "react";

import { mqttConfig } from "../config/mqtt";

export type MqttStatus = "disconnected" | "connecting" | "connected" | "error";

type StatusListener = (status: MqttStatus) => void;

const DEFAULT_TIMEOUT_MS = 8000;

let client: MqttClient | null = null;
let status: MqttStatus = "disconnected";
const listeners = new Set<StatusListener>();

const notifyStatus = () => {
  listeners.forEach((listener) => listener(status));
};

const setStatus = (next: MqttStatus) => {
  if (status === next) return;
  status = next;
  notifyStatus();
};

const buildMqttUrl = () => {
  const protocol = mqttConfig.protocol;
  const host = mqttConfig.host;
  const port = mqttConfig.port;
  const portSegment = port ? `:${port}` : "";
  return `${protocol}://${host}${portSegment}`;
};

export const connectMqttClient = (): MqttClient => {
  if (client) {
    return client;
  }

  setStatus("connecting");

  const options: IClientOptions = {
    username: mqttConfig.username,
    password: mqttConfig.password,
    keepalive: 60,
    reconnectPeriod: 2000,
  };

  const url = buildMqttUrl();
  client = connect(url, options);

  client.on("connect", () => {
    setStatus("connected");
    console.info("[MQTT] conectado:", url);
  });

  client.on("reconnect", () => {
    setStatus("connecting");
    console.info("[MQTT] reconectando...");
  });

  client.on("close", () => {
    setStatus("disconnected");
    console.info("[MQTT] desconectado.");
  });

  client.on("offline", () => {
    setStatus("disconnected");
    console.warn("[MQTT] offline.");
  });

  client.on("error", (error) => {
    setStatus("error");
    console.error("[MQTT] erro de conexão:", error);
  });

  return client;
};

export const disconnectMqttClient = () => {
  if (!client) return;
  client.end(true);
  client = null;
  setStatus("disconnected");
};

export const ensureMqttConnection = (timeoutMs = DEFAULT_TIMEOUT_MS) =>
  new Promise<MqttClient>((resolve, reject) => {
    const activeClient = connectMqttClient();

    if (activeClient.connected) {
      resolve(activeClient);
      return;
    }

    const handleConnect = () => {
      cleanup();
      resolve(activeClient);
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timeout ao conectar no broker MQTT."));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      activeClient.off("connect", handleConnect);
      activeClient.off("error", handleError);
    };

    activeClient.on("connect", handleConnect);
    activeClient.on("error", handleError);
  });

export const getMqttStatus = () => status;

export const subscribeMqttStatus = (listener: StatusListener) => {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
};

export const useMqttStatus = () =>
  useSyncExternalStore(subscribeMqttStatus, getMqttStatus, getMqttStatus);

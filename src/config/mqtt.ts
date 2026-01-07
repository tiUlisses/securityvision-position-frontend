// src/config/mqtt.ts
type MqttProtocol = "ws" | "wss" | "mqtt" | "mqtts";

const parsePort = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const MQTT_HOST =
  (import.meta.env.VITE_MQTT_HOST as string | undefined) ?? "localhost";
const MQTT_PORT = parsePort(import.meta.env.VITE_MQTT_PORT as string | undefined);
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME as string | undefined;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD as string | undefined;
const MQTT_PROTOCOL =
  (import.meta.env.VITE_MQTT_PROTOCOL as MqttProtocol | undefined) ?? "ws";

export const mqttConfig = {
  host: MQTT_HOST,
  port: MQTT_PORT,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  protocol: MQTT_PROTOCOL,
};

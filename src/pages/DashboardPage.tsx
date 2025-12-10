// securityvision-position-frontend/src/pages/DashboardPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, API_BASE_URL } from "../api/client";
import type { Building, FloorPlan, Device, Person, Tag } from "../api/types";
import Modal from "../components/common/Modal";

type Gateway = Device;

/**
 * DTOs alinhados com app/schemas/location.py
 */
interface PersonCurrentLocationDTO {
  person_id: number;
  person_full_name: string;

  tag_id: number;
  tag_mac_address: string;

  device_id: number;
  device_name: string;
  device_mac_address?: string | null;

  device_pos_x?: number | null;
  device_pos_y?: number | null;

  floor_plan_id: number;
  floor_plan_name: string;
  floor_plan_image_url?: string | null;

  floor_id: number;
  floor_name: string;

  building_id: number;
  building_name: string;

  last_seen_at: string;
}

interface DeviceCurrentOccupancyDTO {
  device_id: number;
  device_name: string;
  device_mac_address?: string | null;
  device_pos_x?: number | null;
  device_pos_y?: number | null;

  floor_plan_id?: number | null;
  floor_plan_name?: string | null;
  floor_plan_image_url?: string | null;

  floor_id?: number | null;
  floor_name?: string | null;

  building_id?: number | null;
  building_name?: string | null;

  people: PersonCurrentLocationDTO[];
}

/**
 * DTO alinhado com app/schemas/alert_event.py
 */
interface AlertEventDTO {
  id: number;
  event_type: string;
  rule_id?: number | null;
  person_id?: number | null;
  tag_id?: number | null;
  device_id?: number | null;
  floor_plan_id?: number | null;
  floor_id?: number | null;
  building_id?: number | null;
  triggered_at?: string;
  started_at?: string;
  last_seen_at?: string;
  ended_at?: string | null;
  message?: string | null;
  payload?: string | null;
}

/**
 * DTO para status de GATEWAY
 * Esperado de: GET /devices/status?only_gateways=true
 */
interface GatewayStatusDTO {
  id: number;
  name: string;
  mac_address?: string | null;
  last_seen_at?: string | null;
  is_online: boolean;
}

/**
 * DTO para eventos de Device (câmera)
 * Alinhado com app/schemas/device_event.py
 */
interface DeviceEventDTO {
  id: number;
  device_id: number;
  topic: string;
  analytic_type: string;
  payload: any;
  occurred_at: string;
  created_at: string;
}

/**
 * Status derivado de eventos /status do cam-bus
 * (não vem de nenhum endpoint separado, é calculado no frontend).
 */
interface CameraStatusInfo {
  isOnline: boolean;
  rawStatus: string | null;
  lastStatusAt: string | null;
}

// Deriva a origin do backend a partir do API_BASE_URL
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

// chave usada no localStorage para guardar os alertas "lidos"
const ALERTS_HIDDEN_STORAGE_KEY = "svpos_alert_hidden_ids_v1";

/**
 * Fallback de cálculo de online/offline apenas pelo last_seen_at,
 * usado caso o status do backend ainda não tenha sido carregado
 * para aquele gateway.
 */
function computeGatewayOnlineFromLastSeen(gw: Gateway): boolean {
  if (!gw.last_seen_at) return false;
  const last = new Date(gw.last_seen_at).getTime();
  if (Number.isNaN(last)) return false;
  const diffMs = Date.now() - last;
  return diffMs < 60_000; // 1 minuto
}

/**
 * Formata segundos em um texto amigável:
 *  - 45s
 *  - 3 min
 *  - 3 min 20s
 *  - 1h 10min
 */
function formatDurationSeconds(rawSeconds: number): string {
  const seconds = Math.max(0, Math.round(rawSeconds));
  if (seconds < 60) return `${seconds}s`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (seconds < 3600) {
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const remMins = Math.floor((seconds % 3600) / 60);

  if (remMins === 0) return `${hours}h`;
  return `${hours}h ${remMins}min`;
}

/**
 * Identifica se um DeviceEvent é um evento de STATUS do cam-bus.
 * Usado para:
 *  - NÃO exibir esses eventos na lista de eventos da câmera
 *  - MAS usar o payload.status para saber se está online/offline
 */
function isStatusEvent(evt: DeviceEventDTO): boolean {
  const analytic = (evt.analytic_type || "").toLowerCase();
  const topic = (evt.topic || "").toLowerCase();

  const isStatusTopic =
    topic.endsWith("/status") || topic.includes("/status/");
  const isStatusAnalytic =
    analytic === "cambus_status" || analytic === "status";

  return isStatusTopic || isStatusAnalytic;
}

export function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | "">(
    ""
  );
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<number | "">(
    ""
  );

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // device_id -> ocupação (people[]) para gateways
  const [occupancyByGatewayId, setOccupancyByGatewayId] = useState<
    Record<number, DeviceCurrentOccupancyDTO>
  >({});

  // device_id -> status de GATEWAY (online/offline + last_seen_at do backend)
  const [gatewayStatusById, setGatewayStatusById] = useState<
    Record<number, GatewayStatusDTO>
  >({});

  // gateway selecionado para abrir o card de detalhes
  const [activeGatewayDetailsId, setActiveGatewayDetailsId] = useState<
    number | null
  >(null);

  // ---- CÂMERAS: status + eventos ----

  // device_id -> status derivado dos eventos /status (cambus_status)
  const [cameraStatusByDeviceId, setCameraStatusByDeviceId] = useState<
    Record<number, CameraStatusInfo>
  >({});

  // device_id -> lista de eventos recentes (SEM eventos de status)
  const [cameraEventsById, setCameraEventsById] = useState<
    Record<number, DeviceEventDTO[]>
  >({});

  // device_id -> quantidade de eventos novos desde que o usuário "olhou"
  const [cameraEventCountById, setCameraEventCountById] = useState<
    Record<number, number>
  >({});

  // device_id -> último id de evento conhecido (para detectar novos)
  const [lastCameraEventIdByDevice, setLastCameraEventIdByDevice] = useState<
    Record<number, number | null>
  >({});

  // device_id -> se tem evento "novo" para animar o pin
  const [cameraHasNewEvent, setCameraHasNewEvent] = useState<
    Record<number, boolean>
  >({});

  // câmera com card de "último evento" aberto no mapa
  const [activeCameraId, setActiveCameraId] = useState<number | null>(null);

  // modal de eventos da câmera
  const [cameraModalCameraId, setCameraModalCameraId] = useState<number | null>(
    null
  );
  const [selectedCameraEventId, setSelectedCameraEventId] = useState<
    number | null
  >(null);

  // ---- ALERTAS ----
  const [alerts, setAlerts] = useState<AlertEventDTO[]>([]);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const [lastAlertId, setLastAlertId] = useState<number | null>(null);

  // ids de alertas selecionados no checkbox
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<number>>(
    () => new Set()
  );

  // ids "lidos"/ocultados localmente
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();

    try {
      const raw = window.localStorage.getItem(ALERTS_HIDDEN_STORAGE_KEY);
      if (!raw) return new Set();

      const arr = JSON.parse(raw) as number[];
      if (!Array.isArray(arr)) return new Set();

      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  // Persiste alertas ocultos no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const arr = Array.from(hiddenAlertIds);
      window.localStorage.setItem(
        ALERTS_HIDDEN_STORAGE_KEY,
        JSON.stringify(arr)
      );
    } catch (err) {
      console.error("Falha ao persistir alertas lidos:", err);
    }
  }, [hiddenAlertIds]);

  // ---------------------------------------------------------------------------
  // Carregamento global (buildings, devices, people, tags)
  // ---------------------------------------------------------------------------

  const loadGlobalData = useCallback(async () => {
    try {
      setLoadingGlobal(true);
      setError(null);

      const [b, d, p, t] = await Promise.all([
        apiGet<Building[]>("/buildings/"),
        apiGet<Device[]>("/devices/"),
        apiGet<Person[]>("/people/"),
        apiGet<Tag[]>("/tags/"),
      ]);

      setBuildings(b);
      setDevices(d);
      setPeople(p);
      setTags(t);

      // Se ainda não há prédio selecionado, assume o primeiro
      setSelectedBuildingId((prev) => {
        if (prev || b.length === 0) return prev || "";
        return b[0].id;
      });
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ?? "Erro inesperado ao carregar dashboard."
      );
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  useEffect(() => {
    void loadGlobalData();
  }, [loadGlobalData]);

  // ---------------------------------------------------------------------------
  // Carrega plantas de um prédio selecionado
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedBuildingId) {
      setFloorPlans([]);
      setSelectedFloorPlanId("");
      setOccupancyByGatewayId({});
      setActiveGatewayDetailsId(null);
      setActiveCameraId(null);
      return;
    }

    async function loadFloorPlans() {
      try {
        const fps = await apiGet<FloorPlan[]>(
          `/buildings/${selectedBuildingId}/floor-plans`
        );
        setFloorPlans(fps);

        // Garante que a planta selecionada sempre pertence ao prédio atual
        setSelectedFloorPlanId((prev) => {
          if (typeof prev === "number" && fps.some((fp) => fp.id === prev)) {
            return prev;
          }
          if (fps.length > 0) {
            return fps[0].id;
          }
          return "";
        });

        // Ao trocar de prédio, limpamos ocupação e cards ativos
        setOccupancyByGatewayId({});
        setActiveGatewayDetailsId(null);
        setActiveCameraId(null);
      } catch (err) {
        console.error("Erro ao carregar plantas do prédio:", err);
        setFloorPlans([]);
        setSelectedFloorPlanId("");
      }
    }

    void loadFloorPlans();
  }, [selectedBuildingId]);

  // ---------------------------------------------------------------------------
  // Polling de presença / ocupação por device (gateway)
  // Usa o endpoint: GET /positions/by-device?floor_plan_id=...
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!selectedFloorPlanId) {
      setOccupancyByGatewayId({});
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const floorPlanIdNum =
      typeof selectedFloorPlanId === "number"
        ? selectedFloorPlanId
        : Number(selectedFloorPlanId);

    async function fetchPresence() {
      try {
        const data = await apiGet<DeviceCurrentOccupancyDTO[]>(
          `/positions/by-device?floor_plan_id=${floorPlanIdNum}&only_active_people=true`
        );

        if (cancelled) return;

        const map: Record<number, DeviceCurrentOccupancyDTO> = {};
        for (const item of data) {
          map[item.device_id] = item;
        }
        setOccupancyByGatewayId(map);
      } catch (err) {
        console.error("Erro ao carregar presença em tempo real:", err);
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(fetchPresence, 3000);
        }
      }
    }

    fetchPresence();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [selectedFloorPlanId]);

  // ---------------------------------------------------------------------------
  // Polling de status dos GATEWAYS (online/offline) via backend
  // GET /devices/status?only_gateways=true
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function fetchGatewayStatus() {
      try {
        const data = await apiGet<GatewayStatusDTO[]>(
          "/devices/status?only_gateways=true"
        );
        if (cancelled) return;

        const map: Record<number, GatewayStatusDTO> = {};
        for (const s of data) {
          map[s.id] = s;
        }
        setGatewayStatusById(map);
      } catch (err) {
        console.error("Erro ao carregar status dos gateways:", err);
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(fetchGatewayStatus, 5000);
        }
      }
    }

    fetchGatewayStatus();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Polling de eventos das CÂMERAS (TODAS as câmeras)
  // GET /devices/cameras/{camera_id}/events?limit=30
  //
  // Aqui:
  //  - usamos eventos de tipo "status" (cambus_status) para definir online/offline
  //  - removemos esses eventos da lista exibida na UI
  // ---------------------------------------------------------------------------

  const selectedFloorPlan = useMemo(() => {
    if (!selectedFloorPlanId) return null;
    const id =
      typeof selectedFloorPlanId === "number"
        ? selectedFloorPlanId
        : Number(selectedFloorPlanId);
    return floorPlans.find((fp) => fp.id === id) ?? null;
  }, [selectedFloorPlanId, floorPlans]);

  useEffect(() => {
    if (devices.length === 0) {
      setCameraEventsById({});
      setCameraStatusByDeviceId({});
      setCameraHasNewEvent({});
      setLastCameraEventIdByDevice({});
      return;
    }

    const cameras = devices.filter((d) => d.type === "CAMERA");
    if (cameras.length === 0) {
      setCameraEventsById({});
      setCameraStatusByDeviceId({});
      setCameraHasNewEvent({});
      setLastCameraEventIdByDevice({});
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    async function fetchCameraEventsLoop() {
      try {
        const uiEventsMap: Record<number, DeviceEventDTO[]> = {};
        const latestIdByDevice: Record<number, number | null> = {};
        const statusMap: Record<number, CameraStatusInfo> = {};

        for (const cam of cameras) {
          try {
            const events = await apiGet<DeviceEventDTO[]>(
              `/devices/cameras/${cam.id}/events?limit=30`
            );

            if (!Array.isArray(events) || events.length === 0) {
              uiEventsMap[cam.id] = [];
              latestIdByDevice[cam.id] = null;
              statusMap[cam.id] = {
                isOnline: false,
                rawStatus: null,
                lastStatusAt: null,
              };
              continue;
            }

            // Encontra o último evento de STATUS para essa câmera
            const latestStatusEvt = events.find((evt) => isStatusEvent(evt));

            let isOnline = false;
            let rawStatus: string | null = null;
            let lastStatusAt: string | null = null;

            if (latestStatusEvt) {
              const payload = (latestStatusEvt.payload || {}) as any;

              const statusValue =
                payload.status ??
                payload.Status ??
                payload.device_status ??
                payload.deviceStatus ??
                null;

              if (typeof statusValue === "string") {
                rawStatus = statusValue.toLowerCase();
                isOnline = rawStatus === "online";
              }

              const tsRaw =
                payload.timestamp ??
                payload.Timestamp ??
                latestStatusEvt.occurred_at ??
                latestStatusEvt.created_at ??
                null;

              if (tsRaw) {
                lastStatusAt = tsRaw;
              }
            }

            statusMap[cam.id] = {
              isOnline,
              rawStatus,
              lastStatusAt,
            };

          // Apenas eventos de /events entram na UI
          // - ignoramos /info (cambus_info)
          // - ignoramos /status (cambus_status)
          // - só fica o que realmente é analítico (faceCapture, FaceDetection etc.)
          const filteredForUI = events.filter((evt) => {
            const topicLower = (evt.topic || "").toLowerCase();

            // Só consideramos tópicos que terminam com "/events"
            if (!topicLower.endsWith("/events")) return false;

            // E garantimos que não é um evento de status (por segurança futura)
            if (isStatusEvent(evt)) return false;

            return true;
          });

          uiEventsMap[cam.id] = filteredForUI;
          latestIdByDevice[cam.id] = filteredForUI[0]?.id ?? null;
          } catch (err) {
            console.error(`Erro ao carregar eventos da câmera ${cam.id}:`, err);
          }
        }

        if (cancelled) return;

        setCameraEventsById(uiEventsMap);
        setCameraStatusByDeviceId(statusMap);

        // Detecta novos eventos comparando com último id conhecido
        setLastCameraEventIdByDevice((prev) => {
          const next: Record<number, number | null> = { ...prev };
          const newFlags: Record<number, boolean> = {};
          const newCounts: Record<number, number> = {};

          for (const [deviceIdStr, latestId] of Object.entries(
            latestIdByDevice
          )) {
            const deviceId = Number(deviceIdStr);
            const prevId = prev[deviceId];

            if (latestId && latestId !== prevId) {
              newFlags[deviceId] = true;
              next[deviceId] = latestId;
              newCounts[deviceId] = 1;
            } else if (latestId && prevId == null) {
              // primeira carga: só registra, sem animação
              next[deviceId] = latestId;
            }
          }

          if (Object.keys(newFlags).length > 0) {
            setCameraHasNewEvent((prevFlags) => ({
              ...prevFlags,
              ...newFlags,
            }));
            setCameraEventCountById((prevCounts) => {
              const merged: Record<number, number> = { ...prevCounts };
              for (const [deviceIdStr, count] of Object.entries(newCounts)) {
                const id = Number(deviceIdStr);
                merged[id] = (merged[id] || 0) + count;
              }
              return merged;
            });
          }

          return next;
        });
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(fetchCameraEventsLoop, 5000);
        }
      }
    }

    fetchCameraEventsLoop();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [devices]);

  // ---------------------------------------------------------------------------
  // Polling de ALERTAS recentes
  // GET /alert-events/?limit=20
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function fetchAlerts() {
      try {
        const data = await apiGet<AlertEventDTO[]>("/alert-events/?limit=20");
        if (cancelled) return;

        setAlerts(data);

        if (data.length > 0) {
          const latestId = data[0].id;
          setLastAlertId((prev) => {
            // primeira carga: só registra, não marca como "novo"
            if (prev === null) {
              return latestId;
            }
            if (latestId !== prev) {
              setHasNewAlerts(true);
              return latestId;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Erro ao carregar alertas:", err);
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(fetchAlerts, 5000);
        }
      }
    }

    fetchAlerts();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Derivados de estado / helpers
  // ---------------------------------------------------------------------------

  const gateways = useMemo(
    () => devices.filter((d) => d.type === "BLE_GATEWAY"),
    [devices]
  );

  const cameras = useMemo(
    () => devices.filter((d) => d.type === "CAMERA"),
    [devices]
  );

  // Usa status vindo do backend, com fallback em last_seen
  const isGatewayOnline = useCallback(
    (gw: Gateway): boolean => {
      const status = gatewayStatusById[gw.id];
      if (status) {
        return status.is_online;
      }
      return computeGatewayOnlineFromLastSeen(gw);
    },
    [gatewayStatusById]
  );

  const onlineGateways = useMemo(
    () => gateways.filter((g) => isGatewayOnline(g)),
    [gateways, isGatewayOnline]
  );

  // Status das câmeras baseado nos eventos /status do cam-bus
  const isCameraOnline = useCallback(
    (cam: Device): boolean => {
      const info = cameraStatusByDeviceId[cam.id];
      return info?.isOnline ?? false;
    },
    [cameraStatusByDeviceId]
  );

  const cameraOnlineCount = useMemo(
    () => cameras.filter((cam) => isCameraOnline(cam)).length,
    [cameras, isCameraOnline]
  );
  const cameraOfflineCount = cameras.length - cameraOnlineCount;

  const gatewaysOnSelectedFloor = useMemo(
    () =>
      selectedFloorPlan
        ? gateways.filter((g) => g.floor_plan_id === selectedFloorPlan.id)
        : [],
    [gateways, selectedFloorPlan]
  );

  const camerasOnSelectedFloor = useMemo(
    () =>
      selectedFloorPlan
        ? cameras.filter((d) => d.floor_plan_id === selectedFloorPlan.id)
        : [],
    [cameras, selectedFloorPlan]
  );

  const resolvedImageUrl = useMemo(() => {
    if (!selectedFloorPlan) return undefined;

    const imageUrl = (selectedFloorPlan as any).image_url as
      | string
      | null
      | undefined;
    const imageFileName = (selectedFloorPlan as any).image_file_name as
      | string
      | null
      | undefined;

    if (imageUrl) {
      return imageUrl.startsWith("/media/")
        ? `${BACKEND_ORIGIN}${imageUrl}`
        : imageUrl;
    }

    if (imageFileName) {
      return `${BACKEND_ORIGIN}/media/floor_plans/${imageFileName}`;
    }

    return undefined;
  }, [selectedFloorPlan]);

  // Alertas visíveis (filtra os que foram "marcados como lidos" localmente)
  const visibleAlerts = alerts.filter((evt) => !hiddenAlertIds.has(evt.id));

  // Handler para marcar alertas como lidos
  const handleMarkAlertsRead = () => {
    setHiddenAlertIds((prev) => {
      const next = new Set(prev);

      if (selectedAlertIds.size > 0) {
        // oculta apenas os selecionados
        selectedAlertIds.forEach((id) => next.add(id));
      } else {
        // nenhum selecionado -> oculta TODOS os atuais
        alerts.forEach((evt) => next.add(evt.id));
      }

      return next;
    });

    setSelectedAlertIds(new Set());
    setHasNewAlerts(false);
  };

  // Utilitário pra montar uma descrição amigável do alerta
  const formatAlertPayload = (evt: AlertEventDTO): string => {
    if (!evt.payload) return "";
    try {
      const parsed = JSON.parse(evt.payload) as any;

      // Eventos de gateway (offline/online)
      if (
        evt.event_type === "GATEWAY_OFFLINE" ||
        evt.event_type === "GATEWAY_ONLINE"
      ) {
        const parts = [
          parsed.device_name,
          parsed.floor_plan_name,
          parsed.building_name ||
            (parsed.building_id ? `Prédio #${parsed.building_id}` : null),
        ]
          .filter(Boolean)
          .map((x: string) => x.trim());

        if (
          evt.event_type === "GATEWAY_OFFLINE" &&
          typeof parsed.offline_seconds === "number"
        ) {
          parts.push(
            `offline há ${formatDurationSeconds(parsed.offline_seconds)}`
          );
        }

        return parts.join(" • ");
      }

      // Eventos de pessoa (setor proibido, dwell, etc.)
      const parts = [
        parsed.person_full_name,
        parsed.device_name,
        parsed.floor_plan_name,
        parsed.building_name ||
          (parsed.building_id ? `Prédio #${parsed.building_id}` : null),
      ]
        .filter(Boolean)
        .map((x: string) => x.trim());
      return parts.join(" • ");
    } catch {
      return "";
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers de interação com os pins de câmera
  // ---------------------------------------------------------------------------

  const handleCameraPinClick = (cam: Device) => {
    setActiveCameraId((current) => (current === cam.id ? null : cam.id));
    // quando o usuário interage, consideramos que ele "viu" os eventos
    setCameraHasNewEvent((prev) => ({ ...prev, [cam.id]: false }));
    setCameraEventCountById((prev) => ({ ...prev, [cam.id]: 0 }));
  };

  const handleOpenCameraModal = (cam: Device) => {
    setCameraModalCameraId(cam.id);
    const events = cameraEventsById[cam.id] || [];
    setSelectedCameraEventId(events[0]?.id ?? null);
    setCameraHasNewEvent((prev) => ({ ...prev, [cam.id]: false }));
    setCameraEventCountById((prev) => ({ ...prev, [cam.id]: 0 }));
  };

  const handleCloseCameraModal = () => {
    setCameraModalCameraId(null);
    setSelectedCameraEventId(null);
  };

  // ---------------------------------------------------------------------------
  // Derivados do modal de câmera
  // ---------------------------------------------------------------------------

  const cameraModalCamera = useMemo(
    () =>
      cameraModalCameraId != null
        ? devices.find((d) => d.id === cameraModalCameraId) || null
        : null,
    [devices, cameraModalCameraId]
  );

  const cameraModalEvents = useMemo(
    () =>
      cameraModalCamera
        ? cameraEventsById[cameraModalCamera.id] || []
        : [],
    [cameraModalCamera, cameraEventsById]
  );

  const cameraSelectedEvent = useMemo(() => {
    if (!cameraModalEvents.length) return null;
    if (!selectedCameraEventId) return cameraModalEvents[0];
    return (
      cameraModalEvents.find((evt) => evt.id === selectedCameraEventId) ||
      cameraModalEvents[0]
    );
  }, [cameraModalEvents, selectedCameraEventId]);

  const cameraSelectedPayload = (cameraSelectedEvent?.payload || {}) as any;
  const cameraSelectedAnalytic: string =
    cameraSelectedPayload.AnalyticType ||
    cameraSelectedEvent?.analytic_type ||
    "";

  const cameraSelectedTimestampRaw: string | null =
    cameraSelectedPayload.Timestamp ||
    cameraSelectedPayload.timestamp ||
    cameraSelectedEvent?.occurred_at ||
    cameraSelectedEvent?.created_at ||
    null;

  let cameraSelectedTimestampLabel = "";
  if (cameraSelectedTimestampRaw) {
    const d = new Date(cameraSelectedTimestampRaw);
    if (!Number.isNaN(d.getTime())) {
      cameraSelectedTimestampLabel = d.toLocaleString();
    }
  }

  const analyticLower = cameraSelectedAnalytic.toLowerCase();
  const isFaceRecognized =
    analyticLower === "facerecognized" ||
    analyticLower === "face_recognized" ||
    analyticLower === "face recognized";

  const snapshotUrl: string | undefined =
    cameraSelectedPayload.SnapshotURL ||
    cameraSelectedPayload.snapshotUrl ||
    cameraSelectedPayload.snapshot_url;

  const meta = cameraSelectedPayload.Meta || {};
  const ffPhotoUrl: string | undefined = meta.ff_person_photo_url;
  const ffName: string | undefined =
    meta.ff_person_name || meta.person_name || undefined;
  const ffConfidence: number | undefined =
    typeof meta.ff_confidence === "number" ? meta.ff_confidence : undefined;

  const cameraDetailInfoItems = useMemo(() => {
    if (!cameraSelectedEvent) return [];

    const boolToLabel = (v: any) => {
      if (typeof v === "boolean") return v ? "Sim" : "Não";
      if (typeof v === "number") {
        if (v === 1) return "Sim";
        if (v === 0) return "Não";
        return String(v);
      }
      return v != null ? String(v) : "";
    };

    const m = meta || {};
    const obj = m.Object || {};

    const items: { label: string; value: string | number }[] = [];

    const push = (label: string, value: any) => {
      if (value === undefined || value === null || value === "") return;
      items.push({ label, value });
    };

    push("Câmera", cameraSelectedPayload.CameraName || cameraModalCamera?.name);
    push("IP da câmera", cameraSelectedPayload.CameraIP);
    push("Prédio", cameraSelectedPayload.Building);
    push("Andar / setor", cameraSelectedPayload.Floor);
    push(
      "Tipo de analítico",
      cameraSelectedPayload.AnalyticType || cameraSelectedEvent.analytic_type
    );
    push("Ação", m.action || m.eventDescription || m.eventType);
    push("Idade estimada", obj.Age ?? m.Age);
    push("Sexo", obj.Sex ?? m.Sex);
    push("Emoção", obj.Emotion ?? m.Emotion);
    push("Máscara", boolToLabel(obj.Mask ?? m.Mask));
    push("Óculos", boolToLabel(obj.Glass ?? m.Glass));
    push(
      "Faces no quadro",
      m.facesCount ?? (Array.isArray(m.Faces) ? m.Faces.length : undefined)
    );

    return items;
  }, [cameraSelectedEvent, cameraSelectedPayload, meta, cameraModalCamera]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Dashboard de Rastreamento
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe o estado geral do ambiente e selecione um prédio/planta
            para visualizar a disposição dos gateways, câmeras e a presença de
            pessoas em tempo quase real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasNewAlerts && (
            <div className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700 shadow-sm animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              Novos alertas
            </div>
          )}
          <button
            type="button"
            onClick={() => void loadGlobalData()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
          >
            Atualizar dados
          </button>
        </div>
      </header>

      {/* ALERTAS RECENTES */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Alertas recentes
              </h2>
              {hasNewAlerts && (
                <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white animate-pulse">
                  NOVOS
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Últimos eventos gerados pelas regras de alerta e status de
              gateways (setores proibidos, tempo de permanência, gateways
              offline/online, etc.). Eventos de status das câmeras ficam
              concentrados no card de câmeras abaixo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {visibleAlerts.length} alerta
              {visibleAlerts.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={handleMarkAlertsRead}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Marcar como lido
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-40 overflow-y-auto text-xs">
          {visibleAlerts.length === 0 ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
              Nenhum alerta recente.
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleAlerts.map((evt) => {
                const payloadSummary =
                  formatAlertPayload(evt) || evt.message || evt.event_type;

                const rawTs =
                  evt.last_seen_at || evt.started_at || evt.triggered_at;
                let timeLabel = "";
                if (rawTs) {
                  const ts = new Date(rawTs);
                  if (!Number.isNaN(ts.getTime())) {
                    timeLabel = ts.toLocaleTimeString();
                  }
                }

                const bgClass =
                  evt.event_type === "GATEWAY_OFFLINE" ||
                  evt.event_type === "FORBIDDEN_SECTOR"
                    ? "bg-rose-50"
                    : evt.event_type === "GATEWAY_ONLINE"
                    ? "bg-emerald-50"
                    : "bg-slate-50";

                const isSelected = selectedAlertIds.has(evt.id);

                return (
                  <li
                    key={evt.id}
                    className={`flex items-center justify-between rounded-md px-2 py-1 ${bgClass}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3 w-3 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedAlertIds((prev) => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(evt.id);
                            } else {
                              next.delete(evt.id);
                            }
                            return next;
                          });
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {evt.event_type}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                          {payloadSummary}
                        </span>
                      </div>
                    </div>
                    <span className="ml-2 text-[10px] text-slate-400 whitespace-nowrap">
                      {timeLabel || "--:--:--"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Resumo geral */}
      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Pessoas cadastradas
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {people.length}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Tags BLE
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {tags.length}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Gateways online
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {onlineGateways.length}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Gateways offline
          </div>
          <div className="mt-1 text-2xl font-semibold text-rose-600">
            {gateways.length - onlineGateways.length}
          </div>
        </div>
        {/* Card único de câmeras (online / offline) */}
        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-medium uppercase text-slate-500">
            Câmeras (todas)
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-xs text-slate-500">Online</span>
              </div>
              <span className="text-lg font-semibold text-sky-600">
                {cameraOnlineCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs text-slate-500">Offline</span>
              </div>
              <span className="text-lg font-semibold text-rose-600">
                {cameraOfflineCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Seleção de prédio/planta + lista rápida de gateways / câmeras */}
      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-800">
            Contexto espacial
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Prédio
              </label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={selectedBuildingId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedBuildingId(value ? Number(value) : "");
                  setSelectedFloorPlanId("");
                  setOccupancyByGatewayId({});
                  setActiveGatewayDetailsId(null);
                  setActiveCameraId(null);
                }}
              >
                <option value="">Selecione um prédio…</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Planta / Andar
              </label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                value={selectedFloorPlanId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedFloorPlanId(value ? Number(value) : "");
                  setOccupancyByGatewayId({});
                  setActiveGatewayDetailsId(null);
                  setActiveCameraId(null);
                }}
                disabled={!selectedBuildingId || floorPlans.length === 0}
              >
                {(!selectedBuildingId || floorPlans.length === 0) && (
                  <option value="">
                    {selectedBuildingId
                      ? "Nenhuma planta cadastrada"
                      : "Selecione um prédio primeiro"}
                  </option>
                )}
                {floorPlans.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista rápida de gateways da planta */}
          {selectedFloorPlan && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Gateways na planta selecionada
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {gatewaysOnSelectedFloor.length === 0 && (
                  <li className="italic text-slate-400">
                    Nenhum gateway associado a esta planta.
                  </li>
                )}
                {gatewaysOnSelectedFloor.map((gw) => {
                  const occ = occupancyByGatewayId[gw.id];
                  const peopleHere = occ?.people ?? [];
                  return (
                    <li
                      key={gw.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1"
                    >
                      <span>
                        {gw.name || gw.mac_address || `Gateway #${gw.id}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isGatewayOnline(gw)
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isGatewayOnline(gw) ? "Online" : "Offline"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-50">
                          {peopleHere.length} pessoa
                          {peopleHere.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Lista rápida de câmeras da planta */}
          {selectedFloorPlan && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Câmeras na planta selecionada
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {camerasOnSelectedFloor.length === 0 && (
                  <li className="italic text-slate-400">
                    Nenhuma câmera associada a esta planta.
                  </li>
                )}
                {camerasOnSelectedFloor.map((cam) => {
                  const online = isCameraOnline(cam);
                  const eventsCount = cameraEventsById[cam.id]?.length || 0;
                  return (
                    <li
                      key={cam.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {(cam as any).code || cam.name || `Câmera #${cam.id}`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          IP: {(cam as any).ip_address || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            online
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {online ? "Online" : "Offline"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {eventsCount} evento
                          {eventsCount === 1 ? "" : "s"}
                        </span>
                        <button
                          type="button"
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-slate-50 hover:bg-slate-800"
                          onClick={() => handleOpenCameraModal(cam)}
                        >
                          Ver eventos
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Visualização da planta */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-slate-800">
            Visualização da planta
          </h2>

          {!selectedFloorPlan && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              Selecione um prédio e uma planta para visualizar.
            </div>
          )}

          {selectedFloorPlan && (
            <div
              className="relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ minHeight: 360 }}
            >
              {resolvedImageUrl ? (
                <>
                  <img
                    src={resolvedImageUrl}
                    alt={selectedFloorPlan.name}
                    className="w-full h-auto object-contain pointer-events-none select-none"
                  />

                  {/* overlay dos gateways + câmeras */}
                  <div className="pointer-events-none absolute inset-0">
                    {/* GATEWAYS */}
                    {gatewaysOnSelectedFloor.map((gw) => {
                      if (
                        gw.pos_x == null ||
                        gw.pos_y == null ||
                        Number.isNaN(gw.pos_x) ||
                        Number.isNaN(gw.pos_y)
                      ) {
                        return null;
                      }

                      const left = `${gw.pos_x * 100}%`;
                      const top = `${gw.pos_y * 100}%`;
                      const online = isGatewayOnline(gw);

                      const occ = occupancyByGatewayId[gw.id];
                      const peopleHere = occ?.people ?? [];
                      const count = peopleHere.length;
                      const isActive = activeGatewayDetailsId === gw.id;

                      return (
                        <div
                          key={gw.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{ left, top }}
                        >
                          <button
                            type="button"
                            className="group pointer-events-auto focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveGatewayDetailsId((current) =>
                                current === gw.id ? null : gw.id
                              );
                              // ao abrir card de gateway, fecha card de câmera
                              setActiveCameraId(null);
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="relative">
                                {/* badge com contagem de pessoas */}
                                <div className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100 shadow-md border border-slate-700">
                                  {count}
                                </div>

                                {/* ícone principal do gateway */}
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-white/30 ${
                                    online
                                      ? "bg-emerald-500 shadow-emerald-500/40"
                                      : "bg-slate-500 shadow-slate-500/40"
                                  }`}
                                >
                                  <span className="text-[10px] font-bold text-white">
                                    GW
                                  </span>
                                </div>
                              </div>

                              {/* label abaixo do ícone */}
                              <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[160px] text-center truncate">
                                {gw.name || gw.mac_address || `GW ${gw.id}`}
                              </div>
                            </div>
                          </button>

                          {/* card com nomes das pessoas presentes */}
                          {isActive && count > 0 && (
                            <div className="mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900/95 p-2 text-[11px] text-slate-100 shadow-lg pointer-events-auto">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase text-slate-400">
                                  Pessoas neste gateway
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {count} pessoa
                                  {count === 1 ? "" : "s"}
                                </span>
                              </div>
                              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                                {peopleHere.map((person) => (
                                  <li
                                    key={person.person_id}
                                    className="truncate"
                                  >
                                    {person.person_full_name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* CÂMERAS */}
                    {camerasOnSelectedFloor.map((cam) => {
                      if (
                        cam.pos_x == null ||
                        cam.pos_y == null ||
                        Number.isNaN(cam.pos_x) ||
                        Number.isNaN(cam.pos_y)
                      ) {
                        return null;
                      }

                      const left = `${cam.pos_x * 100}%`;
                      const top = `${cam.pos_y * 100}%`;
                      const online = isCameraOnline(cam);
                      const eventCount = cameraEventCountById[cam.id] || 0;
                      const hasNew = cameraHasNewEvent[cam.id];
                      const isActive = activeCameraId === cam.id;

                      return (
                        <div
                          key={`cam-${cam.id}`}
                          className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{ left, top }}
                        >
                          <button
                            type="button"
                            className="group pointer-events-auto focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCameraPinClick(cam);
                              // ao interagir com câmera, fechamos card de gateway
                              setActiveGatewayDetailsId(null);
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="relative">
                                {/* badge com contagem de eventos */}
                                {eventCount > 0 && (
                                  <div
                                    className={`absolute -top-2 -right-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md border border-white/70 ${
                                      hasNew ? "animate-bounce" : ""
                                    }`}
                                  >
                                    {eventCount}
                                  </div>
                                )}

                                {/* ícone principal da câmera */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border border-white/40 ${
                                    online
                                      ? "bg-sky-500 shadow-sky-500/40"
                                      : "bg-slate-500 shadow-slate-500/40"
                                  } ${
                                    hasNew
                                      ? "ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-900 animate-pulse"
                                      : ""
                                  }`}
                                >
                                  {/* ícone "câmera" simples */}
                                  <div className="flex items-center gap-0.5">
                                    <span className="inline-block h-3 w-4 rounded-sm bg-black/30" />
                                    <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
                                  </div>
                                </div>
                              </div>

                              {/* label abaixo do ícone */}
                              <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[160px] text-center truncate">
                                {(cam as any).code ||
                                  cam.name ||
                                  `CAM ${cam.id}`}
                              </div>
                            </div>
                          </button>

                          {/* mini-card com resumo do último evento */}
                          {isActive && (
                            <div className="mt-2 w-64 rounded-lg border border-slate-800 bg-slate-900/95 p-2 text-[11px] text-slate-100 shadow-lg pointer-events-auto">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase text-slate-400">
                                  Último evento da câmera
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    online
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                  }`}
                                >
                                  {online ? "Online" : "Offline"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {cameraEventsById[cam.id]?.[0] ? (
                                  <>
                                    <p className="text-[11px] font-medium truncate">
                                      {
                                        cameraEventsById[cam.id][0]
                                          .analytic_type
                                      }
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(
                                        cameraEventsById[cam.id][0]
                                          .occurred_at ||
                                          cameraEventsById[cam.id][0]
                                            .created_at
                                      ).toLocaleString()}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-[10px] text-slate-400">
                                    Nenhum evento registrado.
                                  </p>
                                )}
                                <button
                                  type="button"
                                  className="mt-1 inline-flex items-center justify-center rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-50 hover:bg-slate-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCameraModal(cam);
                                  }}
                                >
                                  Ver eventos detalhados
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-200">
                  Esta planta não possui imagem definida.
                </div>
              )}
            </div>
          )}
        </section>
      </section>

      {loadingGlobal && (
        <p className="text-xs text-slate-400">Carregando dados do dashboard…</p>
      )}

      {error && (
        <p className="text-xs text-red-500">
          Erro ao carregar dashboard: {error}
        </p>
      )}

      {/* Modal de eventos da câmera */}
      {cameraModalCamera && (
        <Modal
          isOpen={true}
          title={`Eventos da câmera: ${
            (cameraModalCamera as any).code || cameraModalCamera.name
          }`}
          onClose={handleCloseCameraModal}
          maxWidthClass="max-w-[95vw] md:max-w-5xl"
        >
          {/* Wrapper para limitar altura e permitir scroll interno */}
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Lista de eventos */}
              <div className="md:w-2/5 border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-100">
                  Eventos recentes
                </div>
                <div className="max-h-[60vh] overflow-y-auto bg-slate-950 text-xs">
                  {cameraModalEvents.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-slate-400">
                      Nenhum evento registrado para esta câmera.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-800">
                      {cameraModalEvents.map((evt) => {
                        const payload = (evt.payload || {}) as any;
                        const analytic =
                          payload.AnalyticType || evt.analytic_type || "—";
                        const tsRaw =
                          payload.Timestamp ||
                          payload.timestamp ||
                          evt.occurred_at ||
                          evt.created_at;
                        let tsLabel = "";
                        if (tsRaw) {
                          const d = new Date(tsRaw);
                          if (!Number.isNaN(d.getTime())) {
                            tsLabel = d.toLocaleString();
                          }
                        }

                        const isSelected = selectedCameraEventId === evt.id;

                        return (
                          <li
                            key={evt.id}
                            className={`cursor-pointer px-3 py-2 ${
                              isSelected
                                ? "bg-slate-800"
                                : "hover:bg-slate-900/70"
                            }`}
                            onClick={() => setSelectedCameraEventId(evt.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-100 truncate">
                                {analytic}
                              </span>
                              {tsLabel && (
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {tsLabel}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 truncate">
                              {payload.Meta?.eventDescription ||
                                payload.Meta?.action ||
                                evt.topic}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Detalhes do evento selecionado */}
              <div className="md:w-3/5 border border-slate-800 rounded-lg bg-slate-950 text-xs flex flex-col">
                {cameraSelectedEvent ? (
                  <>
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-100 uppercase tracking-wide">
                          {cameraSelectedAnalytic || "Evento de câmera"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {cameraSelectedTimestampLabel || "Sem timestamp"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isFaceRecognized
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-sky-500/20 text-sky-300"
                        }`}
                      >
                        {isFaceRecognized
                          ? "Reconhecimento facial"
                          : "Analítico de câmera"}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 px-3 py-3">
                      {/* Imagens (snapshot + face cadastrada) */}
                      {(snapshotUrl || (isFaceRecognized && ffPhotoUrl)) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {snapshotUrl && (
                            <div>
                              <div className="mb-1 text-[10px] font-semibold text-slate-400">
                                Snapshot do evento
                              </div>
                              <div className="overflow-hidden rounded-md border border-slate-800 bg-black/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={snapshotUrl}
                                  alt="Snapshot do evento"
                                  className="h-auto w-full object-cover"
                                />
                              </div>
                            </div>
                          )}

                          {isFaceRecognized && ffPhotoUrl && (
                            <div>
                              <div className="mb-1 text-[10px] font-semibold text-slate-400">
                                Face cadastrada
                              </div>
                              <div className="overflow-hidden rounded-md border border-slate-800 bg-black/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ffPhotoUrl}
                                  alt="Foto cadastrada"
                                  className="h-auto w-full object-cover"
                                />
                              </div>
                              <div className="mt-1 text-[10px] text-slate-300 space-y-0.5">
                                {ffName && <div>ID pessoa: {ffName}</div>}
                                {typeof ffConfidence === "number" && (
                                  <div>
                                    Confiança:{" "}
                                    {(ffConfidence * 100).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Detalhes estruturados do evento (para qualquer tipo) */}
                      {cameraDetailInfoItems.length > 0 && (
                        <div className="grid grid-cols-1 gap-y-1 gap-x-3 sm:grid-cols-2 text-[11px]">
                          {cameraDetailInfoItems.map((item) => (
                            <div key={item.label} className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                                {item.label}
                              </span>
                              <span className="text-[11px] text-slate-100">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* JSON bruto de Meta (para análise detalhada) */}
                      {meta && Object.keys(meta).length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">
                            Meta (JSON bruto)
                          </div>
                          <div className="max-h-44 overflow-auto rounded-md bg-slate-950 border border-slate-800 p-2 text-[10px] font-mono text-slate-300">
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(meta, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {!snapshotUrl &&
                        !isFaceRecognized &&
                        cameraDetailInfoItems.length === 0 &&
                        (!meta || Object.keys(meta).length === 0) && (
                          <div className="flex flex-1 items-center justify-center text-[11px] text-slate-400">
                            Evento registrado, mas sem informações adicionais no
                            payload.
                          </div>
                        )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-[11px] text-slate-400">
                    Nenhum evento selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default DashboardPage;

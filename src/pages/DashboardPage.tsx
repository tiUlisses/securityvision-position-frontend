import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, API_BASE_URL } from "../api/client";
import type {
  Building,
  FloorPlan,
  Device,
  Person,
  Tag,
  DeviceCurrentOccupancy,
  GatewayStatusDTO,
  DeviceEventDTO,
  CameraStatusInfo,
  Incident,
} from "../api/types";
import { fetchMyIncidents } from "../api/incidents";
import { listSupportGroups, type SupportGroupEntity } from "../api/supportGroups";
import { useAuth } from "../contexts/AuthContext";
import CameraEventsModal from "../components/dashboard/CameraEventsModal";
import IncidentFromEventModal from "../components/dashboard/IncidentFromEventModal";

type Gateway = Device;

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
const RECENT_INCIDENTS_HIDDEN_STORAGE_KEY = "svpos_recent_incidents_hidden_ids_v1";
const CAMERA_ALERTS_HIDDEN_STORAGE_KEY = "svpos_camera_alerts_hidden_types_v1";

function computeGatewayOnlineFromLastSeen(gw: any): boolean {
  if (!gw.last_seen_at) return false;
  const last = new Date(gw.last_seen_at).getTime();
  if (Number.isNaN(last)) return false;
  const diffMs = Date.now() - last;
  return diffMs < 60_000;
}

function isStatusEvent(evt: DeviceEventDTO): boolean {
  const analytic = (evt.analytic_type || "").toLowerCase();
  const topic = (evt.topic || "").toLowerCase();
  const isStatusTopic = topic.endsWith("/status") || topic.includes("/status/");
  const isStatusAnalytic = analytic === "cambus_status" || analytic === "status";
  return isStatusTopic || isStatusAnalytic;
}

function getEventAnalyticLabel(evt: DeviceEventDTO): string {
  const payload = (evt.payload || {}) as any;
  return payload.AnalyticType || evt.analytic_type || "";
}

function normalizeAnalyticType(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function formatAnalyticLabel(value: string): string {
  if (!value) return "";
  const withSpaces = value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function DashboardPage() {
  const { user } = useAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroupEntity[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | "">("");
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<number | "">("");

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [occupancyByGatewayId, setOccupancyByGatewayId] = useState<
    Record<number, DeviceCurrentOccupancy>
  >({});

  const [gatewayStatusById, setGatewayStatusById] = useState<
    Record<number, GatewayStatusDTO>
  >({});

  const [activeGatewayDetailsId, setActiveGatewayDetailsId] = useState<number | null>(null);

  // CÂMERAS
  const [cameraStatusByDeviceId, setCameraStatusByDeviceId] = useState<
    Record<number, CameraStatusInfo>
  >({});
  const [cameraEventsById, setCameraEventsById] = useState<Record<number, DeviceEventDTO[]>>(
    {}
  );
  const [cameraEventCountById, setCameraEventCountById] = useState<Record<number, number>>({});
  const [lastCameraEventIdByDevice, setLastCameraEventIdByDevice] = useState<
    Record<number, number | null>
  >({});
  const [cameraHasNewEvent, setCameraHasNewEvent] = useState<Record<number, boolean>>({});
  const [activeCameraId, setActiveCameraId] = useState<number | null>(null);
  const [availableCameraAnalytics, setAvailableCameraAnalytics] = useState<string[]>([]);
  const [hiddenCameraAnalytics, setHiddenCameraAnalytics] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CAMERA_ALERTS_HIDDEN_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => typeof item === "string");
    } catch {
      return [];
    }
  });

  // Modais
  const [cameraModalCameraId, setCameraModalCameraId] = useState<number | null>(null);
  const [incidentModalEvent, setIncidentModalEvent] = useState<DeviceEventDTO | null>(null);

  // Incidentes recentes (minhas filas)
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [hasNewIncidents, setHasNewIncidents] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<number | null>(null);
  const [selectedIncidentIds, setSelectedIncidentIds] = useState<Set<number>>(() => new Set());

  const [hiddenIncidentIds, setHiddenIncidentIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(RECENT_INCIDENTS_HIDDEN_STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as number[];
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        RECENT_INCIDENTS_HIDDEN_STORAGE_KEY,
        JSON.stringify(Array.from(hiddenIncidentIds))
      );
    } catch {
      // ignore
    }
  }, [hiddenIncidentIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CAMERA_ALERTS_HIDDEN_STORAGE_KEY,
        JSON.stringify(hiddenCameraAnalytics)
      );
    } catch {
      // ignore
    }
  }, [hiddenCameraAnalytics]);

  const loadGlobalData = useCallback(async () => {
    try {
      setLoadingGlobal(true);
      setError(null);

      const [b, d, p, t, groups] = await Promise.all([
        apiGet<Building[]>("/buildings/"),
        apiGet<Device[]>("/devices/"),
        apiGet<Person[]>("/people/"),
        apiGet<Tag[]>("/tags/"),
        listSupportGroups(),
      ]);

      setBuildings(b);
      setDevices(d);
      setPeople(p);
      setTags(t);
      setSupportGroups(groups);

      setSelectedBuildingId((prev) => {
        if (prev || b.length === 0) return prev || "";
        return b[0].id;
      });
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado ao carregar dashboard.");
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  useEffect(() => {
    void loadGlobalData();
  }, [loadGlobalData]);

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
        const fps = await apiGet<FloorPlan[]>(`/buildings/${selectedBuildingId}/floor-plans`);
        setFloorPlans(fps);

        setSelectedFloorPlanId((prev) => {
          if (typeof prev === "number" && fps.some((fp) => fp.id === prev)) return prev;
          return fps[0]?.id ?? "";
        });

        setOccupancyByGatewayId({});
        setActiveGatewayDetailsId(null);
        setActiveCameraId(null);
      } catch {
        setFloorPlans([]);
        setSelectedFloorPlanId("");
      }
    }

    void loadFloorPlans();
  }, [selectedBuildingId]);

  // Presença / ocupação por gateway
  useEffect(() => {
    if (!selectedFloorPlanId) {
      setOccupancyByGatewayId({});
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const floorPlanIdNum =
      typeof selectedFloorPlanId === "number" ? selectedFloorPlanId : Number(selectedFloorPlanId);

    async function fetchPresence() {
      try {
        const data = await apiGet<DeviceCurrentOccupancy[]>(
          `/positions/by-device?floor_plan_id=${floorPlanIdNum}&only_active_people=true`
        );
        if (cancelled) return;

        const map: Record<number, DeviceCurrentOccupancy> = {};
        for (const item of data) map[item.device_id] = item;
        setOccupancyByGatewayId(map);
      } catch {
        // ignore
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(fetchPresence, 3000);
      }
    }

    fetchPresence();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [selectedFloorPlanId]);

  // Status gateways
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function fetchGatewayStatus() {
      try {
        const data = await apiGet<GatewayStatusDTO[]>("/devices/status?only_gateways=true");
        if (cancelled) return;

        const map: Record<number, GatewayStatusDTO> = {};
        for (const s of data) map[s.id] = s;
        setGatewayStatusById(map);
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(fetchGatewayStatus, 5000);
      }
    }

    fetchGatewayStatus();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Eventos das câmeras
  useEffect(() => {
    const cameras = devices.filter((d) => d.type === "CAMERA");
    if (cameras.length === 0) {
      setCameraEventsById({});
      setCameraStatusByDeviceId({});
      setCameraHasNewEvent({});
      setLastCameraEventIdByDevice({});
      setAvailableCameraAnalytics([]);
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    async function loop() {
      try {
        const uiEventsMap: Record<number, DeviceEventDTO[]> = {};
        const latestIdByDevice: Record<number, number | null> = {};
        const statusMap: Record<number, CameraStatusInfo> = {};
        const analyticsMap = new Map<string, string>();
        const hiddenAnalyticsSet = new Set(
          hiddenCameraAnalytics.map((item) => normalizeAnalyticType(item))
        );

        for (const cam of cameras) {
          try {
            const events = await apiGet<DeviceEventDTO[]>(
              `/devices/cameras/${cam.id}/events?limit=30`
            );

            if (!Array.isArray(events) || events.length === 0) {
              uiEventsMap[cam.id] = [];
              latestIdByDevice[cam.id] = null;
              statusMap[cam.id] = { isOnline: false, rawStatus: null, lastStatusAt: null };
              continue;
            }

            // status
            const statusEvt = events.find((evt) => isStatusEvent(evt));
            let isOnline = false;
            let rawStatus: string | null = null;
            let lastStatusAt: string | null = null;

            if (statusEvt) {
              const p = (statusEvt.payload || {}) as any;
              const statusValue = p.status ?? p.Status ?? p.device_status ?? p.deviceStatus ?? null;
              if (typeof statusValue === "string") {
                rawStatus = statusValue.toLowerCase();
                isOnline = rawStatus === "online";
              }
              const tsRaw = p.timestamp ?? p.Timestamp ?? statusEvt.occurred_at ?? statusEvt.created_at ?? null;
              if (tsRaw) lastStatusAt = tsRaw;
            }

            statusMap[cam.id] = { isOnline, rawStatus, lastStatusAt };

            // somente eventos /events (sem status)
            const filteredForUI = events.filter((evt) => {
              const topicLower = (evt.topic || "").toLowerCase();
              if (!topicLower.endsWith("/events")) return false;
              if (isStatusEvent(evt)) return false;
              const analyticLabel = getEventAnalyticLabel(evt);
              if (!analyticLabel) return true;
              const analyticKey = normalizeAnalyticType(analyticLabel);
              return !hiddenAnalyticsSet.has(analyticKey);
            });

            for (const evt of events) {
              const topicLower = (evt.topic || "").toLowerCase();
              if (!topicLower.endsWith("/events")) continue;
              if (isStatusEvent(evt)) continue;
              const analyticLabel = getEventAnalyticLabel(evt);
              if (!analyticLabel) continue;
              const analyticKey = normalizeAnalyticType(analyticLabel);
              if (!analyticsMap.has(analyticKey)) {
                analyticsMap.set(analyticKey, analyticLabel);
              }
            }

            uiEventsMap[cam.id] = filteredForUI;
            latestIdByDevice[cam.id] = filteredForUI[0]?.id ?? null;
          } catch {
            // ignore
          }
        }

        if (cancelled) return;

        setCameraEventsById(uiEventsMap);
        setCameraStatusByDeviceId(statusMap);
        setAvailableCameraAnalytics(
          Array.from(analyticsMap.values()).sort((a, b) => a.localeCompare(b))
        );

        setLastCameraEventIdByDevice((prev) => {
          const next = { ...prev };
          const newFlags: Record<number, boolean> = {};
          const newCounts: Record<number, number> = {};

          for (const [deviceIdStr, latestId] of Object.entries(latestIdByDevice)) {
            const deviceId = Number(deviceIdStr);
            const prevId = prev[deviceId];

            if (latestId && latestId !== prevId) {
              newFlags[deviceId] = true;
              next[deviceId] = latestId;
              newCounts[deviceId] = 1;
            } else if (latestId && prevId == null) {
              next[deviceId] = latestId;
            }
          }

          if (Object.keys(newFlags).length > 0) {
            setCameraHasNewEvent((pf) => ({ ...pf, ...newFlags }));
            setCameraEventCountById((pc) => {
              const merged = { ...pc };
              for (const [k, c] of Object.entries(newCounts)) {
                const id = Number(k);
                merged[id] = (merged[id] || 0) + c;
              }
              return merged;
            });
          }

          return next;
        });
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(loop, 5000);
      }
    }

    loop();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [devices, hiddenCameraAnalytics]);

  useEffect(() => {
    setCameraEventCountById({});
    setCameraHasNewEvent({});
    setLastCameraEventIdByDevice({});
  }, [hiddenCameraAnalytics]);

  // Incidentes recentes (minhas filas)
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function loop() {
      try {
        const data = await fetchMyIncidents({ limit: 20, only_open: true });
        if (cancelled) return;

        setRecentIncidents(data);

        if (data.length > 0) {
          const latestId = data[0].id;
          setLastIncidentId((prev) => {
            if (prev === null) return latestId;
            if (latestId !== prev) {
              setHasNewIncidents(true);
              return latestId;
            }
            return prev;
          });
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) timeoutId = window.setTimeout(loop, 5000);
      }
    }

    loop();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const gateways = useMemo(() => devices.filter((d) => d.type === "BLE_GATEWAY"), [devices]);
  const cameras = useMemo(() => devices.filter((d) => d.type === "CAMERA"), [devices]);

  const selectedFloorPlan = useMemo(() => {
    if (!selectedFloorPlanId) return null;
    const id = typeof selectedFloorPlanId === "number" ? selectedFloorPlanId : Number(selectedFloorPlanId);
    return floorPlans.find((fp) => fp.id === id) ?? null;
  }, [selectedFloorPlanId, floorPlans]);

  const gatewaysOnSelectedFloor = useMemo(() => {
    if (!selectedFloorPlan) return [];
    return gateways.filter((g) => g.floor_plan_id === selectedFloorPlan.id);
  }, [gateways, selectedFloorPlan]);

  const camerasOnSelectedFloor = useMemo(() => {
    if (!selectedFloorPlan) return [];
    return cameras.filter((c) => c.floor_plan_id === selectedFloorPlan.id);
  }, [cameras, selectedFloorPlan]);

  const hiddenAnalyticsSet = useMemo(
    () => new Set(hiddenCameraAnalytics.map((item) => normalizeAnalyticType(item))),
    [hiddenCameraAnalytics]
  );

  const isGatewayOnline = useCallback(
    (gw: Gateway) => {
      const status = gatewayStatusById[gw.id];
      if (status) return status.is_online;
      return computeGatewayOnlineFromLastSeen(gw);
    },
    [gatewayStatusById]
  );

  const isCameraOnline = useCallback(
    (cam: Device) => {
      return cameraStatusByDeviceId[cam.id]?.isOnline ?? false;
    },
    [cameraStatusByDeviceId]
  );

  const onlineGateways = useMemo(() => gateways.filter((g) => isGatewayOnline(g)), [gateways, isGatewayOnline]);

  const cameraOnlineCount = useMemo(() => cameras.filter((c) => isCameraOnline(c)).length, [cameras, isCameraOnline]);
  const cameraOfflineCount = cameras.length - cameraOnlineCount;

  const resolvedImageUrl = useMemo(() => {
    if (!selectedFloorPlan) return undefined;

    const imageUrl = (selectedFloorPlan as any).image_url as string | null | undefined;
    const imageFileName = (selectedFloorPlan as any).image_file_name as string | null | undefined;

    if (imageUrl) {
      return imageUrl.startsWith("/media/") ? `${BACKEND_ORIGIN}${imageUrl}` : imageUrl;
    }
    if (imageFileName) {
      return `${BACKEND_ORIGIN}/media/floor_plans/${imageFileName}`;
    }
    return undefined;
  }, [selectedFloorPlan]);

  const visibleRecentIncidents = useMemo(
    () => recentIncidents.filter((i) => !hiddenIncidentIds.has(i.id)),
    [recentIncidents, hiddenIncidentIds]
  );

  const handleMarkIncidentsRead = () => {
    setHiddenIncidentIds((prev) => {
      const next = new Set(prev);
      if (selectedIncidentIds.size > 0) {
        selectedIncidentIds.forEach((id) => next.add(id));
      } else {
        recentIncidents.forEach((i) => next.add(i.id));
      }
      return next;
    });

    setSelectedIncidentIds(new Set());
    setHasNewIncidents(false);
  };

  const handleCameraPinClick = (cam: Device) => {
    setActiveCameraId((cur) => (cur === cam.id ? null : cam.id));
    setCameraHasNewEvent((prev) => ({ ...prev, [cam.id]: false }));
    setCameraEventCountById((prev) => ({ ...prev, [cam.id]: 0 }));
  };

  const handleOpenCameraModal = (cam: Device) => {
    setCameraModalCameraId(cam.id);
    setCameraHasNewEvent((prev) => ({ ...prev, [cam.id]: false }));
    setCameraEventCountById((prev) => ({ ...prev, [cam.id]: 0 }));
  };

  const cameraModalCamera = useMemo(() => {
    if (cameraModalCameraId == null) return null;
    return devices.find((d) => d.id === cameraModalCameraId) || null;
  }, [devices, cameraModalCameraId]);

  const cameraModalEvents = useMemo(() => {
    if (!cameraModalCamera) return [];
    return cameraEventsById[cameraModalCamera.id] || [];
  }, [cameraModalCamera, cameraEventsById]);

  const visibleCameraAnalytics = useMemo(() => {
    if (availableCameraAnalytics.length === 0) return [];
    return availableCameraAnalytics
      .map((analytic) => ({
        key: normalizeAnalyticType(analytic),
        raw: analytic,
        label: formatAnalyticLabel(analytic),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [availableCameraAnalytics]);

  const severityChip = (sev: string) => {
    const s = (sev || "").toUpperCase();
    if (s === "CRITICAL") return "bg-rose-600/15 text-rose-700";
    if (s === "HIGH") return "bg-orange-600/15 text-orange-700";
    if (s === "MEDIUM") return "bg-amber-600/15 text-amber-700";
    return "bg-slate-600/15 text-slate-700";
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard de Rastreamento</h1>
          <p className="text-sm text-slate-500">
            Acompanhe o estado geral do ambiente e visualize planta/gateways/câmeras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasNewIncidents && (
            <div className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700 shadow-sm animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              Novos incidentes
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

      {/* INCIDENTES RECENTES (minhas filas) */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Incidentes recentes (minhas filas)
              </h2>
              {hasNewIncidents && (
                <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white animate-pulse">
                  NOVOS
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Mostra apenas incidentes que você pode atuar (atribuídos a você, aos seus grupos, ou gerais).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {visibleRecentIncidents.length} incidente{visibleRecentIncidents.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={handleMarkIncidentsRead}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Marcar como lido
            </button>
          </div>
        </div>

        <div className="mt-3 max-h-44 overflow-y-auto text-xs">
          {visibleRecentIncidents.length === 0 ? (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
              Nenhum incidente recente.
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleRecentIncidents.map((inc) => {
                const isSelected = selectedIncidentIds.has(inc.id);

                const rawTs = inc.created_at || inc.updated_at;
                let timeLabel = "";
                if (rawTs) {
                  const ts = new Date(rawTs);
                  if (!Number.isNaN(ts.getTime())) timeLabel = ts.toLocaleTimeString();
                }

                return (
                  <li
                    key={inc.id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3 w-3 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedIncidentIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(inc.id);
                            else next.delete(inc.id);
                            return next;
                          });
                        }}
                      />

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">
                            #{inc.id} — {inc.title}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityChip(inc.severity)}`}>
                            {inc.severity}
                          </span>
                          {inc.assigned_group?.name && (
                            <span className="inline-flex rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              {inc.assigned_group.name}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                          {inc.description || "Sem descrição."}
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
          <div className="text-xs font-medium uppercase text-slate-500">Pessoas cadastradas</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{people.length}</div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Tags BLE</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{tags.length}</div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Gateways online</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{onlineGateways.length}</div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Gateways offline</div>
          <div className="mt-1 text-2xl font-semibold text-rose-600">
            {gateways.length - onlineGateways.length}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-medium uppercase text-slate-500">Câmeras (todas)</div>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-xs text-slate-500">Online</span>
              </div>
              <span className="text-lg font-semibold text-sky-600">{cameraOnlineCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs text-slate-500">Offline</span>
              </div>
              <span className="text-lg font-semibold text-rose-600">{cameraOfflineCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Seleção prédio/planta + listas */}
      <section className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-800">Contexto espacial</h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Prédio</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Planta / Andar</label>
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
                    {selectedBuildingId ? "Nenhuma planta cadastrada" : "Selecione um prédio primeiro"}
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

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Alertas visíveis das câmeras
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
                  onClick={() => setHiddenCameraAnalytics([])}
                  disabled={hiddenCameraAnalytics.length === 0}
                >
                  Mostrar todos
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
                  onClick={() =>
                    setHiddenCameraAnalytics(visibleCameraAnalytics.map((item) => item.key))
                  }
                  disabled={visibleCameraAnalytics.length === 0}
                >
                  Ocultar todos
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Desmarque os tipos que você não deseja ver nos alertas e contadores.
            </p>
            {visibleCameraAnalytics.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-400">
                Nenhum analítico encontrado ainda.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleCameraAnalytics.map((analytic) => {
                  const isChecked = !hiddenAnalyticsSet.has(analytic.key);
                  return (
                    <label
                      key={analytic.key}
                      className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] ${
                        isChecked
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={isChecked}
                        onChange={() => {
                          setHiddenCameraAnalytics((prev) => {
                            const next = new Set(
                              prev.map((item) => normalizeAnalyticType(item))
                            );
                            if (next.has(analytic.key)) {
                              next.delete(analytic.key);
                            } else {
                              next.add(analytic.key);
                            }
                            return Array.from(next);
                          });
                        }}
                      />
                      <span>{analytic.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {selectedFloorPlan && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Gateways na planta selecionada
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {gatewaysOnSelectedFloor.length === 0 && (
                  <li className="italic text-slate-400">Nenhum gateway associado a esta planta.</li>
                )}
                {gatewaysOnSelectedFloor.map((gw) => {
                  const occ = occupancyByGatewayId[gw.id];
                  const peopleHere = occ?.people ?? [];
                  return (
                    <li
                      key={gw.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1"
                    >
                      <span>{gw.name || gw.mac_address || `Gateway #${gw.id}`}</span>
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
                          {peopleHere.length} pessoa{peopleHere.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {selectedFloorPlan && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Câmeras na planta selecionada
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {camerasOnSelectedFloor.length === 0 && (
                  <li className="italic text-slate-400">Nenhuma câmera associada a esta planta.</li>
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
                            online ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {online ? "Online" : "Offline"}
                        </span>

                        <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {eventsCount} evento{eventsCount === 1 ? "" : "s"}
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

        {/* Planta */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-slate-800">Visualização da planta</h2>

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

                  <div className="pointer-events-none absolute inset-0">
                    {/* Gateways */}
                    {gatewaysOnSelectedFloor.map((gw) => {
                      if (gw.pos_x == null || gw.pos_y == null) return null;

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
                              setActiveGatewayDetailsId((cur) => (cur === gw.id ? null : gw.id));
                              setActiveCameraId(null);
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="relative">
                                <div className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100 shadow-md border border-slate-700">
                                  {count}
                                </div>

                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-white/30 ${
                                    online
                                      ? "bg-emerald-500 shadow-emerald-500/40"
                                      : "bg-slate-500 shadow-slate-500/40"
                                  }`}
                                >
                                  <span className="text-[10px] font-bold text-white">GW</span>
                                </div>
                              </div>

                              <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[160px] text-center truncate">
                                {gw.name || gw.mac_address || `GW ${gw.id}`}
                              </div>
                            </div>
                          </button>

                          {isActive && count > 0 && (
                            <div className="mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900/95 p-2 text-[11px] text-slate-100 shadow-lg pointer-events-auto">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase text-slate-400">
                                  Pessoas neste gateway
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {count} pessoa{count === 1 ? "" : "s"}
                                </span>
                              </div>
                              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                                {peopleHere.map((p) => (
                                  <li key={p.person_id} className="truncate">
                                    {p.person_full_name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Câmeras */}
                    {camerasOnSelectedFloor.map((cam) => {
                      if (cam.pos_x == null || cam.pos_y == null) return null;

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
                              setActiveGatewayDetailsId(null);
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div className="relative">
                                {eventCount > 0 && (
                                  <div
                                    className={`absolute -top-2 -right-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-md border border-white/70 ${
                                      hasNew ? "animate-bounce" : ""
                                    }`}
                                  >
                                    {eventCount}
                                  </div>
                                )}

                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg border border-white/40 ${
                                    online ? "bg-sky-500 shadow-sky-500/40" : "bg-slate-500 shadow-slate-500/40"
                                  } ${
                                    hasNew ? "ring-2 ring-indigo-300 ring-offset-2 ring-offset-slate-900 animate-pulse" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-0.5">
                                    <span className="inline-block h-3 w-4 rounded-sm bg-black/30" />
                                    <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
                                  </div>
                                </div>
                              </div>

                              <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[160px] text-center truncate">
                                {(cam as any).code || cam.name || `CAM ${cam.id}`}
                              </div>
                            </div>
                          </button>

                          {isActive && (
                            <div className="mt-2 w-64 rounded-lg border border-slate-800 bg-slate-900/95 p-2 text-[11px] text-slate-100 shadow-lg pointer-events-auto">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase text-slate-400">
                                  Último evento da câmera
                                </span>
                                <span className={`text-[10px] ${online ? "text-emerald-400" : "text-rose-400"}`}>
                                  {online ? "Online" : "Offline"}
                                </span>
                              </div>

                              <div className="space-y-1">
                                {cameraEventsById[cam.id]?.[0] ? (
                                  <>
                                    <p className="text-[11px] font-medium truncate">
                                      {cameraEventsById[cam.id][0].analytic_type}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {new Date(
                                        cameraEventsById[cam.id][0].occurred_at ||
                                          cameraEventsById[cam.id][0].created_at
                                      ).toLocaleString()}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-[10px] text-slate-400">Nenhum evento registrado.</p>
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

      {loadingGlobal && <p className="text-xs text-slate-400">Carregando dados do dashboard…</p>}
      {error && <p className="text-xs text-red-500">Erro ao carregar dashboard: {error}</p>}

      {/* Modal eventos da câmera */}
      {cameraModalCamera && (
        <CameraEventsModal
          isOpen={true}
          camera={cameraModalCamera}
          events={cameraModalEvents}
          onClose={() => setCameraModalCameraId(null)}
          creatingIncident={false}
          onRequestCreateIncident={(evt) => {
            setCameraModalCameraId(null);
            setIncidentModalEvent(evt);
          }}
        />
      )}

      {/* Modal criar incidente (com grupo) */}
      {incidentModalEvent && (
        <IncidentFromEventModal
          isOpen={true}
          event={incidentModalEvent}
          camera={
            devices.find((d) => d.id === incidentModalEvent.device_id) || null
          }
          supportGroups={supportGroups}
          currentUserId={user?.id}
          onClose={() => setIncidentModalEvent(null)}
          onCreated={(incident) => {
            alert(`Incidente #${incident.id} criado com sucesso.`);
            setHiddenIncidentIds((prev) => {
              const next = new Set(prev);
              next.delete(incident.id);
              return next;
            });
            setRecentIncidents((prev) => [incident, ...prev].slice(0, 20));
            setHasNewIncidents(true);
          }}
        />
      )}
    </div>
  );
}

export default DashboardPage;

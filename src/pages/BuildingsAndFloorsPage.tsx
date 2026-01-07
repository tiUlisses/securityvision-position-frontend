// src/pages/BuildingsAndFloorsPage.tsx
import React, {
  FC,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import Modal from "../components/common/Modal";
import {
  apiGet,
  apiPost,
  apiUpload,
  apiPut,
  apiDelete,
  API_BASE_URL,
} from "../api/client";
import { CameraAnalyticsSelector } from "../components/devices/CameraAnalyticsSelector";
import { DEFAULT_ANALYTICS_BY_MANUFACTURER } from "../constants/analytics";
import ManagementCard from "../components/buildings/ManagementCard";
import CreationChecklist from "../components/buildings/CreationChecklist";
import ResourceListCard from "../components/buildings/ResourceListCard";
import FloorPlanListCard from "../components/buildings/FloorPlanListCard";
import CameraQuickForm from "../components/buildings/CameraQuickForm";
import CameraListCard from "../components/buildings/CameraListCard";

export interface Building {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
}

export interface Floor {
  id: number;
  name: string;
  level?: number | null;
  building_id: number;
}

export interface FloorPlan {
  id: number;
  name: string;
  floor_id: number;
  image_url: string | null;
}

export interface Device {
  id: number;
  name: string;
  type: string; // "BLE_GATEWAY" | "CAMERA" | outros tipos futuros
  mac_address: string | null;

  // identificador lógico
  code?: string | null;

  // Campos específicos de câmera (podem ser null p/ gateways)
  ip_address?: string | null;
  port?: number | null;
  rtsp_url?: string | null;
  central_host?: string | null;
  username?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  building_id?: number | null;
  floor_id?: number | null;
  analytics?: string[] | null;

  floor_plan_id: number | null;
  pos_x: number | null;
  pos_y: number | null;
  last_seen_at: string | null;
}

// Deriva a origin do backend a partir do API_BASE_URL
// ex: http://localhost:8000/api/v1 -> http://localhost:8000
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/* -------------------------------------------------------------------------- */
/*                                CAMERA EDIT MODAL                           */
/* -------------------------------------------------------------------------- */

interface CameraEditModalProps {
  camera: Device;
  onClose: () => void;
  onUpdated: (updated: Device) => void;
}

const CameraEditModal: FC<CameraEditModalProps> = ({
  camera,
  onClose,
  onUpdated,
}) => {
  const [name, setName] = useState(camera.name || "");
  const [code, setCode] = useState(camera.code || "");
  const [ip, setIp] = useState(camera.ip_address || "");
  const [port, setPort] = useState((camera.port ?? 80).toString());
  const [rtspUrl, setRtspUrl] = useState(camera.rtsp_url || "");
  const [centralHost, setCentralHost] = useState(camera.central_host || "");
  const [username, setUsername] = useState(camera.username || "admin");
  const [password, setPassword] = useState(""); // senha nunca volta do backend
  const [manufacturer, setManufacturer] = useState(
    camera.manufacturer || "Dahua"
  );
  const [model, setModel] = useState(camera.model || "any");
  const [analytics, setAnalytics] = useState<string[]>(
    camera.analytics || []
  );

  // Se mudar fabricante e não houver analytics ainda, aplica defaults
  useEffect(() => {
    const key = manufacturer.toLowerCase();
    const defaults = DEFAULT_ANALYTICS_BY_MANUFACTURER[key];
    if (defaults && analytics.length === 0) {
      setAnalytics(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manufacturer]);

  const handleSave = async () => {
    const payload: any = {
      name: name.trim(),
      code: code.trim(),
      ip_address: ip.trim(),
      port: Number(port) || 80,
      rtsp_url: rtspUrl.trim(),
      central_host: centralHost.trim(),
      username: username.trim() || "admin",
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      analytics,
    };

    if (password.trim()) {
      payload.password = password;
    }

    try {
      const updated = await apiPut<Device>(
        `/devices/cameras/${camera.id}`,
        payload
      );
      onUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar câmera:", err);
      alert("Erro ao atualizar câmera. Verifique o console para detalhes.");
    }
  };

  return (
    <Modal
      isOpen={true}
      title={`Editar câmera: ${camera.name}`}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4 text-sm">
        <p className="text-xs text-slate-400">
          Ajuste as informações de rede, identificação e analíticos da câmera.
          As alterações serão refletidas automaticamente no broker MQTT e no
          cam-bus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Nome da câmera"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Código (ex: fixa01)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="IP da câmera"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Porta (80)"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="RTSP URL"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
          />
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Host central (MTX)"
            value={centralHost}
            onChange={(e) => setCentralHost(e.target.value)}
          />
          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Nova senha (opcional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <select
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            >
              <option value="Dahua">Dahua</option>
              <option value="Hikvision">Hikvision</option>
            </select>
            <span className="text-[10px] text-slate-500">
              O fabricante define o conjunto de analíticos disponíveis.
            </span>
          </div>

          <input
            type="text"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
            placeholder="Modelo"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />

          <div className="md:col-span-2">
            <CameraAnalyticsSelector
              manufacturer={manufacturer}
              value={analytics}
              onChange={setAnalytics}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-slate-700 rounded text-slate-100 hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-sv-accent text-white rounded hover:bg-sv-accentSoft"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/*                           FLOOR PLAN EDITOR (mapa)                         */
/* -------------------------------------------------------------------------- */

const FloorPlanEditor: FC<{
  floorPlan: FloorPlan;
  devices: Device[];
  onDeviceUpdated: (device: Device) => void;
  onClose: () => void;
}> = ({ floorPlan, devices, onDeviceUpdated, onClose }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // posições (em pixels dentro do container)
  const [positions, setPositions] = useState<
    Record<number, { x: number; y: number }>
  >({});

  // controle de drag
  const [draggingDeviceId, setDraggingDeviceId] = useState<number | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);

  const planGateways = devices.filter(
    (d) => d.type === "BLE_GATEWAY" && d.floor_plan_id === floorPlan.id
  );

  const planCameras = devices.filter(
    (d) => d.type === "CAMERA" && d.floor_plan_id === floorPlan.id
  );

  const availableGateways = devices.filter((d) => d.type === "BLE_GATEWAY");
  const availableCameras = devices.filter((d) => d.type === "CAMERA");

  const resolvedImageUrl = floorPlan.image_url
    ? floorPlan.image_url.startsWith("/media/")
      ? `${BACKEND_ORIGIN}${floorPlan.image_url}`
      : floorPlan.image_url
    : undefined;

  const updateContainerSize = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
  };

  useLayoutEffect(() => {
    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, []);

  // inicializa posições em pixels com base em pos_x/pos_y (0..1)
  useEffect(() => {
    if (!containerSize.width || !containerSize.height) return;

    setPositions((prev) => {
      const next = { ...prev };

      const allDevices = [...planGateways, ...planCameras];
      for (const d of allDevices) {
        if (next[d.id]) continue;

        let x = containerSize.width / 2;
        let y = containerSize.height / 2;

        if (d.pos_x != null && d.pos_y != null) {
          x = d.pos_x * containerSize.width;
          y = d.pos_y * containerSize.height;
        }

        next[d.id] = { x, y };
      }
      return next;
    });
  }, [
    containerSize.width,
    containerSize.height,
    floorPlan.id,
    planGateways,
    planCameras,
  ]);

  const toRelative = (x: number, y: number) => {
    const w = containerSize.width || 1;
    const h = containerSize.height || 1;
    return { relX: x / w, relY: y / h };
  };

  const handlePersistPosition = async (device: Device, x: number, y: number) => {
    const { relX, relY } = toRelative(x, y);

    setPositions((prev) => ({
      ...prev,
      [device.id]: { x, y },
    }));

    try {
      const updated = await apiPut<Device>(`/devices/${device.id}`, {
        floor_plan_id: floorPlan.id,
        pos_x: relX,
        pos_y: relY,
      });
      onDeviceUpdated(updated);
    } catch (err) {
      console.error("Erro ao atualizar posição do dispositivo:", err);
    }
  };

  // mouse down em qualquer dispositivo -> inicia drag
  const handleMouseDownDevice = (
    device: Device,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return; // só botão esquerdo
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const currentPos =
      positions[device.id] ?? {
        x: rect.width / 2,
        y: rect.height / 2,
      };

    dragOffsetRef.current = {
      dx: pointerX - currentPos.x,
      dy: pointerY - currentPos.y,
    };
    setDraggingDeviceId(device.id);

    // evita selecionar texto enquanto arrasta
    event.preventDefault();
  };

  // listeners globais de mousemove / mouseup enquanto arrasta
  useEffect(() => {
    if (draggingDeviceId == null) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || draggingDeviceId == null || !dragOffsetRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      let pointerX = event.clientX - rect.left;
      let pointerY = event.clientY - rect.top;

      // limita dentro do container
      pointerX = Math.max(0, Math.min(rect.width, pointerX));
      pointerY = Math.max(0, Math.min(rect.height, pointerY));

      const { dx, dy } = dragOffsetRef.current;
      const newX = pointerX - dx;
      const newY = pointerY - dy;

      setPositions((prev) => ({
        ...prev,
        [draggingDeviceId]: { x: newX, y: newY },
      }));
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!containerRef.current || draggingDeviceId == null || !dragOffsetRef.current) {
        setDraggingDeviceId(null);
        dragOffsetRef.current = null;
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      let pointerX = event.clientX - rect.left;
      let pointerY = event.clientY - rect.top;

      pointerX = Math.max(0, Math.min(rect.width, pointerX));
      pointerY = Math.max(0, Math.min(rect.height, pointerY));

      const { dx, dy } = dragOffsetRef.current;
      const finalX = pointerX - dx;
      const finalY = pointerY - dy;

      const device = [...planGateways, ...planCameras].find(
        (d) => d.id === draggingDeviceId
      );
      if (device) {
        void handlePersistPosition(device, finalX, finalY);
      }

      setDraggingDeviceId(null);
      dragOffsetRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingDeviceId, planGateways, planCameras]);

  const handleMoveToThisPlan = async (device: Device) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = rect.width / 2 || 150;
    const y = rect.height / 2 || 150;
    const { relX, relY } = toRelative(x, y);

    const payload: any = {
      floor_plan_id: floorPlan.id,
      floor_id: floorPlan.floor_id,
      pos_x: relX,
      pos_y: relY,
    };

    let endpoint = `/devices/${device.id}`;
    if (device.type === "CAMERA") {
      endpoint = `/devices/cameras/${device.id}`;
    }

    try {
      const updated = await apiPut<Device>(endpoint, payload);

      setPositions((prev) => ({
        ...prev,
        [updated.id]: { x, y },
      }));
      onDeviceUpdated(updated);
    } catch (err) {
      console.error("Erro ao mover dispositivo para esta planta:", err);
    }
  };

  const handleRemoveFromPlan = async (device: Device) => {
    try {
      const updated = await apiPut<Device>(`/devices/${device.id}`, {
        floor_plan_id: null,
        pos_x: null,
        pos_y: null,
      });

      setPositions((prev) => {
        const { [device.id]: _, ...rest } = prev;
        return rest;
      });
      onDeviceUpdated(updated);
    } catch (err) {
      console.error("Erro ao remover dispositivo da planta:", err);
    }
  };

  const getDevicePlanLabel = (d: Device) => {
    if (d.floor_plan_id === null) return "Não associado a nenhuma planta";
    if (d.floor_plan_id === floorPlan.id) return "Nesta planta";
    return `Em outra planta (ID ${d.floor_plan_id})`;
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between items-center mb-1">
        <div>
          <div className="text-slate-200 font-medium">
            Planta: {floorPlan.name} (ID {floorPlan.id})
          </div>
          <div className="text-xs text-slate-500">
            Arraste os ícones dos dispositivos para posicioná-los na planta.
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
        >
          Fechar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        {/* Canvas da planta */}
        <div className="flex flex-col gap-2">
          <div
            ref={containerRef}
            className="relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ minHeight: 360 }}
          >
            {resolvedImageUrl ? (
              <>
                <img
                  src={resolvedImageUrl}
                  alt={floorPlan.name}
                  className="w-full h-auto object-contain pointer-events-none select-none"
                  onLoad={updateContainerSize}
                />

                {/* Gateways no mapa */}
                {planGateways.map((d) => {
                  const pos = positions[d.id];
                  if (!pos) return null;
                  return (
                    <div
                      key={`gw-${d.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move"
                      style={{ left: pos.x, top: pos.y }}
                      onMouseDown={(e) => handleMouseDownDevice(d, e)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-sv-accent flex items-center justify-center shadow-lg shadow-sv-accent/40 border border-white/30">
                          <span className="text-[10px] font-bold text-white">
                            GW
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[140px] text-center truncate">
                          {d.name}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Câmeras no mapa */}
                {planCameras.map((d) => {
                  const pos = positions[d.id];
                  if (!pos) return null;
                  return (
                    <div
                      key={`cam-${d.id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move"
                      style={{ left: pos.x, top: pos.y }}
                      onMouseDown={(e) => handleMouseDownDevice(d, e)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 border border-white/30">
                          <span className="text-[10px] font-bold text-white">
                            CAM
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded bg-black/70 text-[10px] text-slate-100 max-w-[160px] text-center truncate">
                          {d.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-xs text-slate-500 text-center px-4">
                Nenhuma imagem configurada para esta planta. Defina uma URL ou
                faça upload de um arquivo na tela de Prédios & Andares.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            * As coordenadas são salvas em relação ao tamanho da planta
            (0..1). A visualização se adapta a diferentes tamanhos de tela.
          </div>
        </div>

        {/* Lista de dispositivos (Gateways + Câmeras) */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80">
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Dispositivos neste ambiente</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto text-xs divide-y divide-slate-800">
            {/* Gateways */}
            <div className="px-3 py-2 bg-slate-950/60">
              <div className="text-[11px] font-semibold text-slate-200 mb-1">
                Gateways BLE
              </div>
              {availableGateways.length === 0 && (
                <div className="text-[11px] text-slate-500">
                  Nenhum gateway BLE cadastrado.
                </div>
              )}
              {availableGateways.map((d) => {
                const inThisPlan = d.floor_plan_id === floorPlan.id;
                return (
                  <div
                    key={`gw-list-${d.id}`}
                    className="py-2 flex items-center justify-between border-t border-slate-800 first:border-t-0"
                  >
                    <div>
                      <div className="text-slate-100 font-medium">
                        {d.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        MAC: {d.mac_address || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {getDevicePlanLabel(d)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {inThisPlan ? (
                        <button
                          onClick={() => handleRemoveFromPlan(d)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMoveToThisPlan(d)}
                          className="text-[11px] px-2 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
                        >
                          Mover para esta planta
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Câmeras */}
            <div className="px-3 py-2 bg-slate-950/60">
              <div className="text-[11px] font-semibold text-slate-200 mb-1">
                Câmeras
              </div>
              {availableCameras.length === 0 && (
                <div className="text-[11px] text-slate-500">
                  Nenhuma câmera cadastrada.
                </div>
              )}
              {availableCameras.map((d) => {
                const inThisPlan = d.floor_plan_id === floorPlan.id;
                return (
                  <div
                    key={`cam-list-${d.id}`}
                    className="py-2 flex items-center justify-between border-t border-slate-800 first:border-t-0"
                  >
                    <div>
                      <div className="text-slate-100 font-medium">
                        {d.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        IP: {d.ip_address || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {getDevicePlanLabel(d)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {inThisPlan ? (
                        <button
                          onClick={() => handleRemoveFromPlan(d)}
                          className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMoveToThisPlan(d)}
                          className="text-[11px] px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-400"
                        >
                          Mover para esta planta
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                          PAGE: BUILDINGS & FLOORS                          */
/* -------------------------------------------------------------------------- */

const BuildingsAndFloorsPage: FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
    null
  );
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);

  const [newBuildingName, setNewBuildingName] = useState("");
  const [newFloorName, setNewFloorName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFloorPlanId, setUploadFloorPlanId] = useState<number | null>(
    null
  );

  const [editingFloorPlan, setEditingFloorPlan] = useState<FloorPlan | null>(
    null
  );

  const [editingCamera, setEditingCamera] = useState<Device | null>(null);

  // Form de nova câmera
  const [newCameraName, setNewCameraName] = useState("");
  const [newCameraCode, setNewCameraCode] = useState("");
  const [newCameraIP, setNewCameraIP] = useState("");
  const [newCameraPort, setNewCameraPort] = useState("80");
  const [newCameraRtspUrl, setNewCameraRtspUrl] = useState("");
  const [newCameraCentralHost, setNewCameraCentralHost] = useState("");
  const [newCameraUsername, setNewCameraUsername] = useState("admin");
  const [newCameraPassword, setNewCameraPassword] = useState("");
  const [newCameraManufacturer, setNewCameraManufacturer] =
    useState("Dahua");
  const [newCameraModel, setNewCameraModel] = useState("any");
  const [newCameraAnalytics, setNewCameraAnalytics] = useState<string[]>([]);

  const loadAll = async () => {
    const [buildingsData, floorsData, floorPlansData, devicesData] =
      await Promise.all([
        apiGet<Building[]>("/buildings/"),
        apiGet<Floor[]>("/floors/"),
        apiGet<FloorPlan[]>("/floor-plans/"),
        apiGet<Device[]>("/devices/"),
      ]);

    setBuildings(buildingsData);
    setFloors(floorsData);
    setFloorPlans(floorPlansData);
    setDevices(devicesData);

    if (!selectedBuildingId && buildingsData.length > 0) {
      setSelectedBuildingId(buildingsData[0].id);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredFloors = selectedBuildingId
    ? floors.filter((f) => f.building_id === selectedBuildingId)
    : [];

  const filteredFloorPlans = selectedFloorId
    ? floorPlans.filter((fp) => fp.floor_id === selectedFloorId)
    : [];

  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim()) return;

    const name = newBuildingName.trim();

    const code = name
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    const payload = {
      name,
      code,
      description: "",
      address: "",
    };

    const created = await apiPost<Building>("/buildings/", payload);
    setBuildings((prev) => [...prev, created]);
    setNewBuildingName("");
  };

  const handleDeleteBuilding = async (buildingId: number) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este prédio? (Andares vinculados podem impedir a exclusão se o backend não fizer cascade.)"
    );
    if (!confirmed) return;
    try {
      await apiDelete(`/buildings/${buildingId}`);
      setBuildings((prev) => prev.filter((b) => b.id !== buildingId));
      setFloors((prev) => prev.filter((f) => f.building_id !== buildingId));
      if (selectedBuildingId === buildingId) {
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
      }
    } catch (err) {
      console.error("Erro ao excluir prédio:", err);
    }
  };

  const handleCreateFloor = async () => {
    if (!selectedBuildingId || !newFloorName.trim()) return;

    const payload = {
      name: newFloorName.trim(),
      building_id: selectedBuildingId,
      level: null,
    };

    const created = await apiPost<Floor>("/floors/", payload);
    setFloors((prev) => [...prev, created]);
    setNewFloorName("");
  };

  const handleDeleteFloor = async (floorId: number) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este andar? As câmeras serão movidas para 'externo/externo' (sem prédio/andar) e continuarão funcionando no cam-bus."
    );
    if (!confirmed) return;

    try {
      // ✅ 1) Descobre todas as câmeras nesse andar
      const camerasOnFloor = devices.filter(
        (d) => d.type === "CAMERA" && d.floor_id === floorId
      );

      if (camerasOnFloor.length > 0) {
        // ✅ 2) Atualiza cada câmera para ficar "órfã" de prédio/andar/planta
        const updatedCameras = await Promise.all(
          camerasOnFloor.map((cam) =>
            apiPut<Device>(`/devices/cameras/${cam.id}`, {
              building_id: null,
              floor_id: null,
              floor_plan_id: null,
              pos_x: null,
              pos_y: null,
            }).catch((err) => {
              console.error(
                "Erro ao mover câmera para externo (mantendo original):",
                cam.id,
                err
              );
              // Se der erro, devolve a câmera original só pra não quebrar o map
              return cam;
            })
          )
        );

        // ✅ 3) Atualiza o state de devices com o retorno do backend
        setDevices((prev) => {
          const byId = new Map(prev.map((d) => [d.id, d]));
          for (const updated of updatedCameras) {
            if (updated && byId.has(updated.id)) {
              byId.set(updated.id, updated);
            }
          }
          return Array.from(byId.values());
        });
      }

      // ✅ 4) Agora sim, exclui o andar
      await apiDelete(`/floors/${floorId}`);

      setFloors((prev) => prev.filter((f) => f.id !== floorId));
      setFloorPlans((prev) => prev.filter((fp) => fp.floor_id !== floorId));

      if (selectedFloorId === floorId) {
        setSelectedFloorId(null);
      }
    } catch (err) {
      console.error("Erro ao excluir andar:", err);
      alert(
        "Erro ao excluir andar ou mover câmeras para 'externo'. Verifique o console para detalhes."
      );
    }
  };


  const handleCreateFloorPlan = async () => {
    if (!selectedFloorId) return;

    const name = generateFloorPlanName(selectedFloorId);

    const created = await apiPost<FloorPlan>("/floor-plans/", {
      name,
      floor_id: selectedFloorId,
    });

    setFloorPlans((prev) => [...prev, created]);
  };

  const handleClickUploadImage = (floorPlanId: number) => {
    setUploadFloorPlanId(floorPlanId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !uploadFloorPlanId) return;

    try {
      const updated = await apiUpload<FloorPlan>(
        `/floor-plans/${uploadFloorPlanId}/image`,
        file
      );
      setFloorPlans((prev) =>
        prev.map((fp) => (fp.id === updated.id ? updated : fp))
      );
    } catch (err) {
      console.error("Erro ao fazer upload de imagem da planta", err);
    } finally {
      e.target.value = "";
      setUploadFloorPlanId(null);
    }
  };

  const handleSetImageUrl = async (floorPlan: FloorPlan) => {
    const current = floorPlan.image_url ?? "";
    const url = window.prompt("Informe a URL da imagem da planta:", current);
    if (url === null) return;

    const trimmed = url.trim();
    if (!trimmed) return;

    try {
      const updated = await apiPut<FloorPlan>(
        `/floor-plans/${floorPlan.id}`,
        {
          image_url: trimmed,
        }
      );
      setFloorPlans((prev) =>
        prev.map((fp) => (fp.id === updated.id ? updated : fp))
      );
    } catch (err) {
      console.error("Erro ao definir URL da planta:", err);
    }
  };

  const handleDeviceUpdated = (device: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === device.id ? device : d)));
  };

  const handleManufacturerChange = (value: string) => {
    setNewCameraManufacturer(value);
    const key = value.toLowerCase();
    const defaults = DEFAULT_ANALYTICS_BY_MANUFACTURER[key] ?? [];
    setNewCameraAnalytics(defaults);
  };

  const handleCreateCamera = async () => {
    if (!selectedBuildingId || !selectedFloorId) {
      alert("Selecione um prédio e um andar antes de cadastrar uma câmera.");
      return;
    }

    const name = newCameraName.trim();
    const code = newCameraCode.trim();
    const ip = newCameraIP.trim();
    const rtspUrl = newCameraRtspUrl.trim();
    const centralHost = newCameraCentralHost.trim();

    if (!name || !code || !ip) {
      alert("Nome, código e IP são obrigatórios.");
      return;
    }

    const payload: any = {
      name,
      code,
      building_id: selectedBuildingId,
      floor_id: selectedFloorId,
      ip_address: ip,
      port: Number(newCameraPort) || 80,
      rtsp_url: rtspUrl,
      central_host: centralHost,
      username: newCameraUsername.trim() || "admin",
      password: newCameraPassword,
      manufacturer: newCameraManufacturer.trim(),
      model: newCameraModel.trim(),
    };

    // Só envia analytics se tiver algo selecionado
    if (newCameraAnalytics && newCameraAnalytics.length > 0) {
      payload.analytics = newCameraAnalytics;
    }

    try {
      const created = await apiPost<Device>("/devices/cameras/", payload);
      setDevices((prev) => [...prev, created]);

      // Reset do form
      setNewCameraName("");
      setNewCameraCode("");
      setNewCameraIP("");
      setNewCameraPort("80");
      setNewCameraRtspUrl("");
      setNewCameraCentralHost("");
      setNewCameraUsername("admin");
      setNewCameraPassword("");
      setNewCameraManufacturer("Dahua");
      setNewCameraModel("any");
      setNewCameraAnalytics([]);
    } catch (err) {
      console.error("Erro ao criar câmera:", err);
      alert("Erro ao criar câmera. Verifique o console para detalhes.");
    }
  };

  const handleDeleteCamera = async (cameraId: number) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta câmera?"
    );
    if (!confirmed) return;

    try {
      await apiDelete(`/devices/${cameraId}`);
      setDevices((prev) => prev.filter((d) => d.id !== cameraId));
    } catch (err) {
      console.error("Erro ao excluir câmera:", err);
    }
  };

  const generateFloorPlanName = (floorId: number): string => {
    // pega o andar correspondente
    const floor = floors.find((f) => f.id === floorId);

    // base do nome: nome do andar, ou "Planta" se não tiver
    const rawBase = (floor?.name || "Planta").trim();

    // substitui espaços por "_" para ficar no padrão "Mezanino_01", "1º_Andar_01"
    const base = rawBase.replace(/\s+/g, "_");

    // quantas plantas já existem nesse andar
    const existingForFloor = floorPlans.filter(
      (fp) => fp.floor_id === floorId
    );

    const index = existingForFloor.length + 1; // 1ª = 01, 2ª = 02...
    const suffix = index.toString().padStart(2, "0");

    return `${base}_${suffix}`;
  };

  const camerasForSelectedFloor = devices.filter(
    (d) =>
      d.type === "CAMERA" &&
      d.building_id === selectedBuildingId &&
      d.floor_id === selectedFloorId
  );

  const checklistSteps = [
    {
      title: "Cadastrar prédio",
      description: "Crie o prédio para liberar o cadastro de andares.",
      done: buildings.length > 0,
    },
    {
      title: "Adicionar andares",
      description: "Relacione os andares ao prédio selecionado.",
      done: !!(selectedBuildingId && filteredFloors.length > 0),
    },
    {
      title: "Criar plantas",
      description: "Crie plantas e defina imagens para posicionamento.",
      done: !!(selectedFloorId && filteredFloorPlans.length > 0),
    },
    {
      title: "Cadastrar dispositivos",
      description: "Inclua câmeras e gateways no ambiente correto.",
      done: camerasForSelectedFloor.length > 0,
    },
  ];

  const buildingItems = buildings.map((b) => ({
    id: b.id,
    title: b.name,
    subtitle: b.address ?? undefined,
    meta: b.description ?? undefined,
  }));

  const selectedBuildingName =
    buildings.find((b) => b.id === selectedBuildingId)?.name ?? "";

  const floorItems = filteredFloors.map((f) => ({
    id: f.id,
    title: f.name,
    meta: selectedBuildingName ? `Prédio: ${selectedBuildingName}` : undefined,
  }));

  return (
    <div className="space-y-6">
      <CreationChecklist steps={checklistSteps} />

      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <ManagementCard
            title="Cadastro de prédios"
            description="Comece registrando o prédio para que os próximos passos sejam habilitados."
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do prédio"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                  value={newBuildingName}
                  onChange={(e) => setNewBuildingName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleCreateBuilding}
                  className="text-xs px-3 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Use um nome claro, como &quot;Unidade Centro&quot; ou &quot;Campus
                Alpha&quot;, para facilitar a busca.
              </p>
            </div>
            <ResourceListCard
              items={buildingItems}
              selectedId={selectedBuildingId}
              onSelect={(id) => {
                setSelectedBuildingId(id);
                setSelectedFloorId(null);
              }}
              onDelete={handleDeleteBuilding}
              emptyMessage="Nenhum prédio cadastrado ainda."
            />
          </ManagementCard>

          <ManagementCard
            title="Cadastro de andares"
            description="Relacione os andares ao prédio selecionado antes de criar plantas."
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do andar (ex: 1º Andar)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 disabled:opacity-50"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  disabled={!selectedBuildingId}
                />
                <button
                  type="button"
                  onClick={handleCreateFloor}
                  disabled={!selectedBuildingId}
                  className="text-xs px-3 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedBuildingId
                  ? `Andares vinculados a ${selectedBuildingName}.`
                  : "Selecione um prédio para habilitar o cadastro de andares."}
              </p>
            </div>
            <ResourceListCard
              items={floorItems}
              selectedId={selectedFloorId}
              onSelect={(id) => setSelectedFloorId(id)}
              onDelete={handleDeleteFloor}
              emptyMessage={
                selectedBuildingId
                  ? "Nenhum andar cadastrado para este prédio."
                  : "Selecione um prédio para visualizar ou cadastrar andares."
              }
            />
          </ManagementCard>
        </div>

        <div className="space-y-4">
          <FloorPlanListCard
            floorPlans={filteredFloorPlans}
            onCreate={handleCreateFloorPlan}
            onEdit={(fp) => setEditingFloorPlan(fp)}
            onUploadImage={handleClickUploadImage}
            onSetImageUrl={handleSetImageUrl}
            disabled={!selectedFloorId}
          />

          <ManagementCard
            title="Câmeras do andar"
            description="Cadastre, edite e acompanhe as câmeras vinculadas ao ambiente selecionado."
            footer="Após criar a planta, utilize o botão Editar planta para posicionar gateways e câmeras."
          >
            <CameraQuickForm
              values={{
                name: newCameraName,
                code: newCameraCode,
                ip: newCameraIP,
                port: newCameraPort,
                rtspUrl: newCameraRtspUrl,
                centralHost: newCameraCentralHost,
                username: newCameraUsername,
                password: newCameraPassword,
                manufacturer: newCameraManufacturer,
                model: newCameraModel,
                analytics: newCameraAnalytics,
              }}
              onFieldChange={(field, value) => {
                switch (field) {
                  case "name":
                    setNewCameraName(value);
                    break;
                  case "code":
                    setNewCameraCode(value);
                    break;
                  case "ip":
                    setNewCameraIP(value);
                    break;
                  case "port":
                    setNewCameraPort(value);
                    break;
                  case "rtspUrl":
                    setNewCameraRtspUrl(value);
                    break;
                  case "centralHost":
                    setNewCameraCentralHost(value);
                    break;
                  case "username":
                    setNewCameraUsername(value);
                    break;
                  case "password":
                    setNewCameraPassword(value);
                    break;
                  case "model":
                    setNewCameraModel(value);
                    break;
                  default:
                    break;
                }
              }}
              onManufacturerChange={handleManufacturerChange}
              onAnalyticsChange={setNewCameraAnalytics}
              onSubmit={handleCreateCamera}
              disabled={!selectedBuildingId || !selectedFloorId}
            />

            <CameraListCard
              cameras={camerasForSelectedFloor}
              onEdit={(cam) => setEditingCamera(cam)}
              onDelete={handleDeleteCamera}
            />
          </ManagementCard>
        </div>
      </div>

      {/* Modal de edição da planta com drag & drop de gateways e câmeras */}
      {editingFloorPlan && (
        <Modal
          isOpen={true}
          title={`Editar planta: ${editingFloorPlan.name}`}
          onClose={() => setEditingFloorPlan(null)}
          maxWidthClass="max-w-5xl"
        >
          <FloorPlanEditor
            floorPlan={editingFloorPlan}
            devices={devices}
            onDeviceUpdated={handleDeviceUpdated}
            onClose={() => setEditingFloorPlan(null)}
          />
        </Modal>
      )}

      {/* Modal de edição de câmera */}
      {editingCamera && (
        <CameraEditModal
          camera={editingCamera}
          onClose={() => setEditingCamera(null)}
          onUpdated={(updated) => {
            setDevices((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
            setEditingCamera(null);
          }}
        />
      )}
    </div>
  );
};

export default BuildingsAndFloorsPage;

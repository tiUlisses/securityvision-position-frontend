import React, { FC, useEffect, useMemo, useState } from "react";
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from "../api/client";

interface Building {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
}

interface Floor {
  id: number;
  name: string;
  level?: number | null;
  building_id: number;
}

interface Device {
  id: number;
  name: string;
  type: string; // "BLE_GATEWAY" | "CAMERA" | ...
  mac_address: string | null;

  code?: string | null;
  ip_address?: string | null;
  port?: number | null;
  username?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  building_id?: number | null;
  floor_id?: number | null;
  floor_plan_id: number | null;
  pos_x: number | null;
  pos_y: number | null;
  last_seen_at: string | null;
}

interface CameraGroup {
  id: number;
  name: string;
  description?: string | null;
  device_ids: number[];
  created_at?: string;
  updated_at?: string;
}

type DraftLocation = {
  building_id: number | null;
  floor_id: number | null;
};

type GroupFilterValue = "ALL" | "UNGROUPED" | number;

// quantos segundos consideramos "online" depois do último contato
const ONLINE_THRESHOLD_SECONDS = 120;

const DevicesPage: FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [onlyExternal, setOnlyExternal] = useState(false);
  const [groupFilter, setGroupFilter] = useState<GroupFilterValue>("ALL");

  // camera.id -> { building_id, floor_id }
  const [draftLocations, setDraftLocations] = useState<
    Record<number, DraftLocation>
  >({});

  // "agora" para recalcular status em tempo real
  const [now, setNow] = useState<Date>(new Date());

  // ---- estados para grupos ----
  const [groupForm, setGroupForm] = useState<{ name: string; description: string }>({
    name: "",
    description: "",
  });
  const [savingGroup, setSavingGroup] = useState(false);

  const [editingGroup, setEditingGroup] = useState<CameraGroup | null>(null);
  const [membershipDraft, setMembershipDraft] = useState<Record<number, boolean>>(
    {}
  );
  const [savingMembership, setSavingMembership] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [buildingsData, floorsData, devicesData, groupsData] = await Promise.all(
        [
          apiGet<Building[]>("/buildings/"),
          apiGet<Floor[]>("/floors/"),
          apiGet<Device[]>("/devices/"),
          apiGet<CameraGroup[]>("devices/camera-groups/"),
        ]
      );

      setBuildings(buildingsData);
      setFloors(floorsData);
      setDevices(devicesData);
      setGroups(
        groupsData.map((g) => ({
          ...g,
          device_ids: g.device_ids || [],
        }))
      );

      const nextDraft: Record<number, DraftLocation> = {};
      devicesData
        .filter((d) => d.type === "CAMERA")
        .forEach((cam) => {
          nextDraft[cam.id] = {
            building_id: cam.building_id ?? null,
            floor_id: cam.floor_id ?? null,
          };
        });
      setDraftLocations(nextDraft);
    } catch (err) {
      console.error("Erro ao carregar dispositivos:", err);
      setError("Erro ao carregar dispositivos. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  const reloadGroups = async () => {
    try {
      const groupsData = await apiGet<CameraGroup[]>("devices/camera-groups/");
      setGroups(
        groupsData.map((g) => ({
          ...g,
          device_ids: g.device_ids || [],
        }))
      );
    } catch (err) {
      console.error("Erro ao recarregar grupos:", err);
      setError("Erro ao recarregar grupos de câmeras.");
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  // atualiza "now" a cada 10s pra reavaliar online/offline
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const cameras = useMemo(
    () => devices.filter((d) => d.type === "CAMERA"),
    [devices]
  );

  const normalizedSearch = search.trim().toLowerCase();

  // mapa cameraId -> lista de grupos
  const groupsByCameraId = useMemo(() => {
    const map: Record<number, CameraGroup[]> = {};
    groups.forEach((group) => {
      const ids = group.device_ids || [];
      ids.forEach((id) => {
        if (!map[id]) map[id] = [];
        map[id].push(group);
      });
    });
    return map;
  }, [groups]);

  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const isExternal =
        (cam.building_id ?? null) === null && (cam.floor_id ?? null) === null;

      if (onlyExternal && !isExternal) return false;

      // filtro por grupo
      if (groupFilter !== "ALL") {
        const camGroups = groupsByCameraId[cam.id] || [];
        if (groupFilter === "UNGROUPED") {
          if (camGroups.length > 0) return false;
        } else {
          const groupId = groupFilter as number;
          if (!camGroups.some((g) => g.id === groupId)) return false;
        }
      }

      if (!normalizedSearch) return true;

      const haystack = [
        cam.name || "",
        cam.code || "",
        cam.ip_address || "",
        cam.manufacturer || "",
        cam.model || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [cameras, onlyExternal, normalizedSearch, groupFilter, groupsByCameraId]);

  const getBuildingName = (id: number | null | undefined): string | null => {
    if (!id) return null;
    const b = buildings.find((b) => b.id === id);
    return b ? b.name : null;
  };

  const getFloorName = (id: number | null | undefined): string | null => {
    if (!id) return null;
    const f = floors.find((f) => f.id === id);
    return f ? f.name : null;
  };

  const getLocationLabel = (cam: Device): string => {
    const bName = getBuildingName(cam.building_id ?? null);
    const fName = getFloorName(cam.floor_id ?? null);

    if (!cam.building_id && !cam.floor_id) {
      return "Externo / Externo (sem prédio/andar)";
    }
    if (bName && fName) {
      return `${bName} • ${fName}`;
    }
    if (bName) {
      return `${bName} • (andar não definido)`;
    }
    if (fName) {
      return `(prédio não definido) • ${fName}`;
    }
    return "Sem localização configurada";
  };

  // formata diferença de tempo em português
  const formatDiff = (diffSeconds: number): string => {
    if (diffSeconds < 0) diffSeconds = 0;
    if (diffSeconds < 10) return "agora";
    if (diffSeconds < 60) return `há ${Math.round(diffSeconds)}s`;

    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `há ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;

    const days = Math.floor(hours / 24);
    return `há ${days} d`;
  };

  type OnlineStatus =
    | { kind: "unknown"; label: string }
    | { kind: "online"; label: string }
    | { kind: "offline"; label: string };

  const getOnlineStatus = (cam: Device): OnlineStatus => {
    if (!cam.last_seen_at) {
      return {
        kind: "unknown",
        label: "Sem eventos registrados",
      };
    }

    const last = new Date(cam.last_seen_at).getTime();
    if (Number.isNaN(last)) {
      return {
        kind: "unknown",
        label: "Último contato: data inválida",
      };
    }

    const diffSeconds = (now.getTime() - last) / 1000;
    const human = `Último contato ${formatDiff(diffSeconds)}`;

    if (diffSeconds <= ONLINE_THRESHOLD_SECONDS) {
      return { kind: "online", label: human };
    }
    return { kind: "offline", label: human };
  };

  const handleChangeDraftBuilding = (cameraId: number, value: string) => {
    const buildingId = value ? Number(value) : null;
    setDraftLocations((prev) => ({
      ...prev,
      [cameraId]: {
        building_id: buildingId,
        // ao trocar prédio, resetamos o andar
        floor_id: null,
      },
    }));
  };

  const handleChangeDraftFloor = (cameraId: number, value: string) => {
    const floorId = value ? Number(value) : null;
    setDraftLocations((prev) => ({
      ...prev,
      [cameraId]: {
        ...(prev[cameraId] || { building_id: null, floor_id: null }),
        floor_id: floorId,
      },
    }));
  };

  const handleSaveLocation = async (camera: Device) => {
    const draft = draftLocations[camera.id];
    if (!draft) return;

    const newBuildingId = draft.building_id;
    const newFloorId = draft.floor_id;

    const changedBuilding =
      (camera.building_id ?? null) !== (newBuildingId ?? null);
    const changedFloor = (camera.floor_id ?? null) !== (newFloorId ?? null);

    const payload: any = {
      building_id: newBuildingId,
      floor_id: newFloorId,
    };

    // Se mudou de prédio/andar, limpamos a associação de planta/posição
    if (changedBuilding || changedFloor) {
      payload.floor_plan_id = null;
      payload.pos_x = null;
      payload.pos_y = null;
    }

    try {
      const updated = await apiPut<Device>(
        `/devices/cameras/${camera.id}`,
        payload
      );
      setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      console.error("Erro ao atualizar localização da câmera:", err);
      alert(
        "Erro ao atualizar localização da câmera. Verifique o console para detalhes."
      );
    }
  };

  // ------- Handlers de grupos -------

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    setSavingGroup(true);
    setError(null);

    try {
      const payload: any = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
      };

      await apiPost<CameraGroup>("devices/camera-groups/", payload);

      setGroupForm({ name: "", description: "" });
      await reloadGroups();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ??
          "Falha ao criar grupo de câmeras. Verifique o console."
      );
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: CameraGroup) => {
    if (
      !window.confirm(
        `Remover o grupo "${group.name}"? As regras associadas a este grupo precisarão ser ajustadas.`
      )
    ) {
      return;
    }

    try {
      await apiDelete(`devices/camera-groups/${group.id}`);
      await reloadGroups();

      // se estava editando esse grupo, fecha o editor
      if (editingGroup && editingGroup.id === group.id) {
        setEditingGroup(null);
        setMembershipDraft({});
      }
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ?? "Falha ao remover grupo de câmeras."
      );
    }
  };

  const openMembershipEditor = (group: CameraGroup) => {
    const draft: Record<number, boolean> = {};
    cameras.forEach((cam) => {
      draft[cam.id] = group.device_ids?.includes(cam.id) ?? false;
    });
    setEditingGroup(group);
    setMembershipDraft(draft);
  };

  const toggleMembership = (deviceId: number) => {
    setMembershipDraft((prev) => ({
      ...prev,
      [deviceId]: !prev[deviceId],
    }));
  };

  const handleSaveMembership = async () => {
    if (!editingGroup) return;

    setSavingMembership(true);
    setError(null);

    try {
      const device_ids = cameras
        .filter((cam) => membershipDraft[cam.id])
        .map((cam) => cam.id);

      await apiPatch<CameraGroup>(`devices/camera-groups/${editingGroup.id}`, {
        device_ids,
      });

      await reloadGroups();
      setEditingGroup(null);
      setMembershipDraft({});
    } catch (err) {
      console.error(err);
      setError(
        (err as Error)?.message ??
          "Falha ao atualizar câmeras do grupo. Verifique o console."
      );
    } finally {
      setSavingMembership(false);
    }
  };

  const handleCancelMembershipEdit = () => {
    setEditingGroup(null);
    setMembershipDraft({});
  };

  const handleChangeGroupFilter = (value: string) => {
    if (!value) {
      setGroupFilter("ALL");
    } else if (value === "UNGROUPED") {
      setGroupFilter("UNGROUPED");
    } else {
      setGroupFilter(Number(value));
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Dispositivos (Câmeras)
          </h1>
          <p className="text-sm text-slate-400">
            Visualize todas as câmeras, edite a localização (prédio/andar) e
            organize em grupos para usar nas regras de incidentes automáticos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            Recarregar
          </button>
        </div>
      </header>

      {/* Filtros */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <input
            type="text"
            placeholder="Buscar por nome, código, IP, fabricante..."
            className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={onlyExternal}
                onChange={(e) => setOnlyExternal(e.target.checked)}
              />
              <span>Mostrar apenas câmeras externas (sem prédio/andar)</span>
            </label>
          </div>
        </div>

        {/* filtro por grupo */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Filtrar por grupo:</span>
          <select
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
            value={
              groupFilter === "ALL"
                ? ""
                : groupFilter === "UNGROUPED"
                ? "UNGROUPED"
                : String(groupFilter)
            }
            onChange={(e) => handleChangeGroupFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="UNGROUPED">Apenas sem grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-rose-500/60 bg-rose-950/60 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* layout principal: lista de câmeras + painel de grupos */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Lista de câmeras */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 text-xs overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <span className="font-semibold text-slate-200">
              Câmeras ({filteredCameras.length})
            </span>
            {loading && (
              <span className="text-[11px] text-slate-400">
                Carregando dispositivos...
              </span>
            )}
          </div>

          {filteredCameras.length === 0 && !loading && (
            <div className="px-3 py-4 text-[11px] text-slate-500">
              Nenhuma câmera encontrada com os filtros atuais.
            </div>
          )}

          {filteredCameras.length > 0 && (
            <div className="divide-y divide-slate-800 max-h-[520px] overflow-y-auto">
              {filteredCameras.map((cam) => {
                const draft =
                  draftLocations[cam.id] || {
                    building_id: cam.building_id ?? null,
                    floor_id: cam.floor_id ?? null,
                  };

                const buildingOptions = buildings;
                const floorOptions = floors.filter(
                  (f) => f.building_id === draft.building_id
                );

                const isExternal =
                  (cam.building_id ?? null) === null &&
                  (cam.floor_id ?? null) === null;

                const locationLabel = getLocationLabel(cam);
                const status = getOnlineStatus(cam);

                const statusBadgeClasses =
                  status.kind === "online"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : status.kind === "offline"
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-slate-700 text-slate-200";

                const statusDotClasses =
                  status.kind === "online"
                    ? "bg-emerald-400"
                    : status.kind === "offline"
                    ? "bg-rose-400"
                    : "bg-slate-400";

                const camGroups = groupsByCameraId[cam.id] || [];

                return (
                  <div
                    key={cam.id}
                    className="px-3 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    {/* Info principal da câmera */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-100 font-medium truncate">
                          {cam.name || `Câmera #${cam.id}`}
                        </span>

                        {cam.code && (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                            {cam.code}
                          </span>
                        )}

                        {isExternal && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                            Externa
                          </span>
                        )}

                        {/* Badge de status online/offline */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${statusBadgeClasses}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusDotClasses}`}
                          />
                          {status.kind === "online"
                            ? "Online"
                            : status.kind === "offline"
                            ? "Offline"
                            : "Sem status"}
                        </span>
                      </div>

                      <div className="mt-0.5 text-[11px] text-slate-400 space-x-2">
                        <span>IP: {cam.ip_address || "—"}</span>
                        <span>•</span>
                        <span>
                          {cam.manufacturer || "Fabricante indefinido"}{" "}
                          {cam.model ? `(${cam.model})` : ""}
                        </span>
                      </div>

                      <div className="mt-1 text-[11px] text-sky-300">
                        Localização atual: {locationLabel}
                      </div>

                      {cam.floor_plan_id && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          Associada à planta ID {cam.floor_plan_id}
                        </div>
                      )}

                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {status.label}
                      </div>

                      {/* Grupos da câmera */}
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="text-slate-400">Grupos:</span>
                        {camGroups.length === 0 ? (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                            Sem grupo
                          </span>
                        ) : (
                          camGroups.map((g) => (
                            <span
                              key={g.id}
                              className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-100"
                            >
                              {g.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Editor de localização (prédio / andar) */}
                    <div className="mt-2 md:mt-0 flex flex-col gap-2 md:w-[340px]">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400">
                          Prédio
                        </label>
                        <select
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                          value={draft.building_id ?? ""}
                          onChange={(e) =>
                            handleChangeDraftBuilding(cam.id, e.target.value)
                          }
                        >
                          <option value="">— Sem prédio (externo)</option>
                          {buildingOptions.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400">
                          Andar / setor
                        </label>
                        <select
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                          value={draft.floor_id ?? ""}
                          onChange={(e) =>
                            handleChangeDraftFloor(cam.id, e.target.value)
                          }
                          disabled={!draft.building_id}
                        >
                          {!draft.building_id && (
                            <option value="">
                              Selecione um prédio primeiro
                            </option>
                          )}
                          {draft.building_id &&
                            (floorOptions.length === 0 ? (
                              <option value="">
                                Nenhum andar cadastrado para este prédio
                              </option>
                            ) : (
                              <>
                                <option value="">— Sem andar</option>
                                {floorOptions.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </>
                            ))}
                        </select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // reset para o valor atual vindo do backend
                            setDraftLocations((prev) => ({
                              ...prev,
                              [cam.id]: {
                                building_id: cam.building_id ?? null,
                                floor_id: cam.floor_id ?? null,
                              },
                            }));
                          }}
                          className="px-3 py-1 rounded bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700"
                        >
                          Desfazer
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveLocation(cam)}
                          className="px-3 py-1 rounded bg-sv-accent text-[11px] text-white hover:bg-sv-accentSoft"
                        >
                          Salvar localização
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel de grupos de câmeras */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 text-xs flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-200">
                Grupos de câmeras
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Crie grupos para facilitar a configuração de regras de
                incidentes (ex.: &quot;Portaria&quot;, &quot;Perímetro&quot;,
                &quot;Caixa&quot;).
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              {groups.length} grupo
              {groups.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {/* Form de criação de grupo */}
            <form
              onSubmit={handleCreateGroup}
              className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-2"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Nome do grupo
                </label>
                <input
                  type="text"
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Portaria, Perímetro, Caixas..."
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">
                  Descrição (opcional)
                </label>
                <textarea
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                  rows={2}
                  value={groupForm.description}
                  onChange={(e) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Notas sobre o grupo, uso previsto, área, etc."
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="px-3 py-1 rounded bg-sv-accent text-[11px] text-white hover:bg-sv-accentSoft disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingGroup ? "Criando..." : "Criar grupo"}
                </button>
              </div>
            </form>

            {/* Lista de grupos existentes */}
            {groups.length === 0 ? (
              <div className="text-[11px] text-slate-500">
                Nenhum grupo criado ainda. Crie um grupo acima e depois adicione
                câmeras.
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const groupCameras = cameras.filter((cam) =>
                    (group.device_ids || []).includes(cam.id)
                  );

                  return (
                    <div
                      key={group.id}
                      className="rounded-md border border-slate-800 bg-slate-950 p-3 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[13px] font-semibold text-slate-100 truncate">
                              {group.name}
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                              {groupCameras.length} câmera
                              {groupCameras.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {group.description && (
                            <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                          {groupCameras.length > 0 && (
                            <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                              {groupCameras
                                .map(
                                  (c) =>
                                    c.name ||
                                    c.code ||
                                    c.ip_address ||
                                    `CAM ${c.id}`
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => openMembershipEditor(group)}
                            className="text-[11px] text-sky-300 hover:text-sky-200"
                          >
                            Editar câmeras
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteGroup(group)}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Editor de membros do grupo selecionado */}
            {editingGroup && (
              <div className="mt-2 rounded-md border border-sky-700/60 bg-sky-950/40 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-slate-50">
                      Câmeras no grupo &quot;{editingGroup.name}&quot;
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Marque as câmeras que devem pertencer a este grupo. Isso
                      será usado, por exemplo, nas regras de incidentes
                      automáticos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelMembershipEdit}
                    className="text-[11px] text-slate-300 hover:text-slate-100"
                  >
                    Fechar
                  </button>
                </div>

                {cameras.length === 0 ? (
                  <div className="text-[11px] text-slate-300">
                    Nenhuma câmera cadastrada.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded border border-slate-800 bg-slate-950/80 divide-y divide-slate-800">
                    {cameras.map((cam) => (
                      <label
                        key={cam.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-100"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={!!membershipDraft[cam.id]}
                          onChange={() => toggleMembership(cam.id)}
                        />
                        <span className="truncate">
                          {cam.name ||
                            cam.code ||
                            cam.ip_address ||
                            `Câmera #${cam.id}`}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelMembershipEdit}
                    className="px-3 py-1 rounded bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveMembership()}
                    disabled={savingMembership}
                    className="px-3 py-1 rounded bg-sv-accent text-[11px] text-white hover:bg-sv-accentSoft disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingMembership ? "Salvando..." : "Salvar câmeras"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DevicesPage;

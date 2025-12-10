// src/pages/GatewaysPage.tsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../api/client";
import type { Device, FloorPlan, Building } from "../types";

type Gateway = Device & {
  floor_plan?: FloorPlan | null;
  building?: Building | null;
};

/**
 * DTO alinhado com app/schemas/device.py (DeviceStatusRead)
 * Endpoint: GET /devices/status?only_gateways=true
 */
interface DeviceStatusDTO {
  id: number;
  name: string;
  mac_address?: string | null;
  last_seen_at?: string | null;
  is_online: boolean;
}

// Mesmo cutoff do dashboard
const ONLINE_THRESHOLD_MS = 60_000;
const RECENT_THRESHOLD_MS = 5 * 60_000;

export function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // device_id -> status vindo do backend
  const [gatewayStatusById, setGatewayStatusById] = useState<
    Record<number, DeviceStatusDTO>
  >({});

  // ---------------------------------------------------------------------------
  // Carregamento inicial de gateways + plantas + prédios
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void loadGateways();
  }, []);

  async function loadGateways() {
    try {
      setLoading(true);
      setError(null);

      const [devices, floorPlans, buildings] = await Promise.all([
        apiGet<Device[]>("/devices/"),
        apiGet<FloorPlan[]>("/floor-plans/"),
        apiGet<Building[]>("/buildings/"),
      ]);

      const byFloorId = new Map<number, FloorPlan>();
      floorPlans.forEach((fp) => byFloorId.set(fp.id, fp));

      const byBuildingId = new Map<number, Building>();
      buildings.forEach((b) => byBuildingId.set(b.id, b));

      const onlyGateways: Gateway[] = devices
        .filter((d) => d.type === "BLE_GATEWAY")
        .map((d) => {
          const floor = d.floor_plan_id
            ? byFloorId.get(d.floor_plan_id) ?? null
            : null;
          const building =
            floor && floor.building_id
              ? byBuildingId.get(floor.building_id) ?? null
              : null;

          return {
            ...d,
            floor_plan: floor,
            building,
          };
        });

      setGateways(onlyGateways);
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Erro ao carregar gateways");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Polling de status dos GATEWAYS (online/offline) via backend
  // GET /devices/status?only_gateways=true
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function fetchGatewayStatus() {
      try {
        const data = await apiGet<DeviceStatusDTO[]>(
          "/devices/status?only_gateways=true"
        );
        if (cancelled) return;

        const map: Record<number, DeviceStatusDTO> = {};
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
  // Edição de nome
  // ---------------------------------------------------------------------------

  function startEdit(gw: Gateway) {
    setEditingId(gw.id);
    setEditingName(gw.name ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(deviceId: number) {
    const trimmed = editingName.trim();
    if (!trimmed) {
      alert("O nome do gateway não pode ser vazio.");
      return;
    }

    try {
      setSavingId(deviceId);
      await apiPut<Gateway>(`/devices/${deviceId}`, {
        name: trimmed,
      });

      setGateways((prev) =>
        prev.map((gw) =>
          gw.id === deviceId
            ? {
                ...gw,
                name: trimmed,
              }
            : gw
        )
      );
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar nome do gateway.");
    } finally {
      setSavingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers de status / last_seen (mesma filosofia do Dashboard)
  // ---------------------------------------------------------------------------

  function getLastSeenRaw(gw: Gateway): string | null {
    const status = gatewayStatusById[gw.id];
    return (status?.last_seen_at ?? gw.last_seen_at ?? null) as
      | string
      | null;
  }

  function formatLastSeen(gw: Gateway): string {
    const raw = getLastSeenRaw(gw);
    if (!raw) return "Nunca";
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleString();
  }

  // Mesmo comportamento do Dashboard: backend manda na decisão
  function isGatewayOnline(gw: Gateway): boolean {
    const status = gatewayStatusById[gw.id];
    if (status) {
      return status.is_online;
    }

    // Fallback se status ainda não carregou
    const raw = getLastSeenRaw(gw);
    if (!raw) return false;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts)) return false;
    const diffMs = Date.now() - ts;
    return diffMs < ONLINE_THRESHOLD_MS;
  }

  function getStatus(gw: Gateway): { label: string; className: string } {
    const status = gatewayStatusById[gw.id];
    const rawLastSeen = getLastSeenRaw(gw);

    // 1) Se temos status do backend, ele é autoritativo.
    if (status) {
      if (status.is_online) {
        return {
          label: "Online",
          className: "bg-emerald-100 text-emerald-800",
        };
      }
      return {
        label: "Offline",
        className: "bg-red-100 text-red-800",
      };
    }

    // 2) Fallback quando status ainda não carregou
    if (!rawLastSeen) {
      return {
        label: "Offline",
        className: "bg-red-100 text-red-800",
      };
    }

    const last = new Date(rawLastSeen).getTime();
    if (Number.isNaN(last)) {
      return {
        label: "Offline",
        className: "bg-red-100 text-red-800",
      };
    }

    const diffMs = Date.now() - last;

    if (diffMs < ONLINE_THRESHOLD_MS) {
      return {
        label: "Online",
        className: "bg-emerald-100 text-emerald-800",
      };
    }

    if (diffMs < RECENT_THRESHOLD_MS) {
      return {
        label: "Recente",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    return {
      label: "Offline",
      className: "bg-red-100 text-red-800",
    };
  }

  const onlineCount = useMemo(
    () => gateways.filter((g) => isGatewayOnline(g)).length,
    [gateways, gatewayStatusById]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Gateways BLE
          </h1>
          <p className="text-sm text-slate-500">
            Edite o nome dos gateways para refletir o cômodo/setor físico
            onde estão instalados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadGateways()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Atualizar lista
          </button>
          {loading && (
            <span className="text-xs text-slate-500">Carregando…</span>
          )}
          {error && (
            <span className="text-xs text-red-500">Erro: {error}</span>
          )}
        </div>
      </header>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Total de Gateways
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {gateways.length}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Online (últimos 60s / backend)
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {onlineCount}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">
            Offline / sem sinal
          </div>
          <div className="mt-1 text-2xl font-semibold text-rose-600">
            {gateways.length - onlineCount}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium text-slate-700">
            Lista de Gateways
          </h2>
          {loading && (
            <span className="text-xs text-slate-500">Carregando…</span>
          )}
          {error && (
            <span className="text-xs text-red-500">Erro: {error}</span>
          )}
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nome (cômodo/setor)</th>
                <th className="px-4 py-2">MAC</th>
                <th className="px-4 py-2">Prédio / Planta</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Último sinal</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gateways.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Nenhum gateway cadastrado ainda. Assim que os Minew
                    começarem a publicar no MQTT, eles aparecerão aqui
                    automaticamente.
                  </td>
                </tr>
              )}

              {gateways.map((gw) => {
                const status = getStatus(gw);
                const isEditing = editingId === gw.id;

                return (
                  <tr
                    key={gw.id}
                    className="border-t text-sm hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-2 align-middle">
                      {isEditing ? (
                        <input
                          className="w-full rounded-md border px-2 py-1 text-sm"
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.target.value)
                          }
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-slate-900">
                          {gw.name || "— sem nome —"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-middle font-mono text-xs text-slate-600">
                      {gw.mac_address || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle text-xs text-slate-600">
                      {gw.building ? (
                        <>
                          <span className="font-medium">
                            {gw.building.name}
                          </span>
                          {gw.floor_plan && (
                            <span className="ml-1 text-slate-500">
                              · {gw.floor_plan.name}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="italic text-slate-400">
                          Não associado a planta
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-xs text-slate-500">
                      {formatLastSeen(gw)}
                    </td>
                    <td className="px-4 py-2 align-middle text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(gw.id)}
                            disabled={savingId === gw.id}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingId === gw.id
                              ? "Salvando..."
                              : "Salvar"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(gw)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                        >
                          Editar nome
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GatewaysPage;

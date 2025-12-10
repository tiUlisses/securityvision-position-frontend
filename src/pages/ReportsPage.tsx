// src/pages/ReportsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Paleta básica para gráficos (Recharts)
 */
const CHART_COLORS = {
  dwell: "#38bdf8", // tempo
  sessions: "#a855f7", // sessões
  people: "#f97316", // pessoas
  grid: "#1f2937", // linhas do grid
};

const PIE_COLORS = [
  "#38bdf8",
  "#a855f7",
  "#f97316",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#6366f1",
  "#0ea5e9",
];

/**
 * =========================
 * Tipos do OVERVIEW
 * =========================
 */

type Summary = {
  from_ts: string | null;
  to_ts: string | null;
  total_sessions: number;
  total_unique_tags: number;
  total_unique_devices: number;
  total_dwell_seconds: number;
  avg_dwell_seconds: number;
  first_session_at: string | null;
  last_session_at: string | null;
};

type TopBuilding = {
  building_id: number | null;
  building_name: string;
  total_sessions: number;
  total_dwell_seconds: number;
};

type TopFloor = {
  building_id: number | null;
  building_name: string;
  floor_id: number | null;
  floor_name: string;
  total_sessions: number;
  total_dwell_seconds: number;
};

type TopDevice = {
  device_id: number;
  device_name: string;
  total_sessions: number;
  total_dwell_seconds: number;
};

type TopPerson = {
  person_id: number;
  person_name: string;
  total_sessions: number;
  total_dwell_seconds: number;
};

type TopGroup = {
  group_id: number;
  group_name: string;
  total_sessions: number;
  total_dwell_seconds: number;
};

type DwellBucket = {
  bucket: string; // ISO datetime
  total_sessions: number;
  total_dwell_seconds: number;
};

type ReportsOverviewApi = {
  summary: Summary;
  top_buildings?: TopBuilding[];
  top_floors?: TopFloor[];
  top_devices?: TopDevice[];
  top_people?: TopPerson[];
  top_groups?: TopGroup[];
  dwell_by_hour?: DwellBucket[];
  dwell_by_day?: DwellBucket[];
};

type ReportsOverview = {
  summary: Summary;
  top_buildings: TopBuilding[];
  top_floors: TopFloor[];
  top_devices: TopDevice[];
  top_people: TopPerson[];
  top_groups: TopGroup[];
  dwell_by_hour: DwellBucket[];
  dwell_by_day: DwellBucket[];
};

/**
 * =========================
 * Tipos de PESSOA / GRUPO
 * =========================
 */

type PersonOption = {
  id: number;
  full_name: string;
};

type PersonGroupOption = {
  id: number;
  name: string;
};

type PersonDwellByDevice = {
  device_id: number;
  device_name: string | null;
  building_id: number | null;
  building_name: string | null;
  floor_id: number | null;
  floor_name: string | null;
  floor_plan_id: number | null;
  floor_plan_name: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
};

type PersonPresenceSummary = {
  person_id: number;
  person_full_name: string;
  from_ts: string | null;
  to_ts: string | null;
  total_dwell_seconds: number;
  total_sessions: number;
  first_session_at: string | null;
  last_session_at: string | null;
  dwell_by_device: PersonDwellByDevice[];
  top_device_id: number | null;
};

type PersonTimeOfDayBucket = {
  hour: number;
  total_dwell_seconds: number;
  sessions_count: number;
};

type PersonTimeOfDayDistribution = {
  person_id: number;
  person_full_name: string;
  from_ts: string | null;
  to_ts: string | null;
  buckets: PersonTimeOfDayBucket[];
};

/**
 * NOVO: distribuição por hora + gateway (pessoa)
 */

type PersonHourGatewayBucket = {
  hour: number;
  device_id: number;
  device_name: string | null;
  total_dwell_seconds: number;
};

type PersonTimeOfDayByGateway = {
  person_id: number;
  person_full_name: string;
  from_ts: string | null;
  to_ts: string | null;
  buckets: PersonHourGatewayBucket[];
};

/**
 * =========================
 * Tipos de GRUPO
 * =========================
 */

type GroupPersonDwellSummary = {
  person_id: number;
  person_full_name: string;
  total_dwell_seconds: number;
  sessions_count: number;
};

type GroupDwellByDevice = {
  device_id: number;
  device_name: string | null;
  building_id: number | null;
  building_name: string | null;
  floor_id: number | null;
  floor_name: string | null;
  floor_plan_id: number | null;
  floor_plan_name: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
};

type PersonGroupPresenceSummary = {
  group_id: number;
  group_name: string;
  from_ts: string | null;
  to_ts: string | null;
  total_dwell_seconds: number;
  total_sessions: number;
  total_unique_people: number;
  first_session_at: string | null;
  last_session_at: string | null;
  dwell_by_device: GroupDwellByDevice[];
  dwell_by_person: GroupPersonDwellSummary[];
  top_device_id: number | null;
};

/**
 * =========================
 * Tipos de GATEWAY
 * =========================
 */

type GatewayUsageDeviceSummary = {
  device_id: number;
  device_name: string | null;
  device_mac_address: string | null;
  building_id: number | null;
  building_name: string | null;
  floor_id: number | null;
  floor_name: string | null;
  floor_plan_id: number | null;
  floor_plan_name: string | null;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
  first_session_at: string | null;
  last_session_at: string | null;
};

type GatewayUsageSummary = {
  from_ts: string | null;
  to_ts: string | null;
  total_sessions: number;
  total_dwell_seconds: number;
  total_devices: number;
  gateways: GatewayUsageDeviceSummary[];
  top_device_id: number | null;
};

type GatewayTimeOfDayBucket = {
  hour: number;
  total_dwell_seconds: number;
  sessions_count: number;
  unique_people_count: number;
};

type GatewayTimeOfDayDistribution = {
  device_id: number;
  device_name: string | null;
  from_ts: string | null;
  to_ts: string | null;
  buckets: GatewayTimeOfDayBucket[];
};

type DeviceOption = {
  id: number;
  name: string;
};

/**
 * =========================
 * Utils
 * =========================
 */

const formatSeconds = (seconds: number): string => {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

type TabKey = "overview" | "person" | "group" | "gateway";

type QuickRangeKey =
  | "last_1h"
  | "last_24h"
  | "last_7d"
  | "last_15d"
  | "last_30d"
  | "custom";

/**
 * Helper para calcular o intervalo de datas/horas
 * baseado no preset selecionado
 */
const computeDateRange = (
  range: QuickRangeKey,
  fromDateStr: string,
  toDateStr: string
): { from: Date | null; to: Date | null } => {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = null;

  switch (range) {
    case "last_1h":
      to = now;
      from = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      break;
    case "last_24h":
      to = now;
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "last_7d":
      to = now;
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_15d":
      to = now;
      from = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    case "last_30d":
      to = now;
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
    default: {
      if (fromDateStr) {
        from = new Date(`${fromDateStr}T00:00:00`);
      }
      if (toDateStr) {
        to = new Date(`${toDateStr}T23:59:59`);
      }
      break;
    }
  }

  return { from, to };
};

const ReportsPage: React.FC = () => {
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // filtros de data
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // preset de intervalo
  const [quickRange, setQuickRange] = useState<QuickRangeKey>("last_24h");

  const [minDurationSeconds, setMinDurationSeconds] = useState<number | undefined>(
    10
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * =========================
   * OVERVIEW STATE
   * =========================
   */
  const [overview, setOverview] = useState<ReportsOverview | null>(null);

  /**
   * =========================
   * PESSOAS STATE
   * =========================
   */
  const [peopleOptions, setPeopleOptions] = useState<PersonOption[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | "">("");
  const [personSummary, setPersonSummary] =
    useState<PersonPresenceSummary | null>(null);
  const [personHourDist, setPersonHourDist] =
    useState<PersonTimeOfDayDistribution | null>(null);
  const [personHourByGateway, setPersonHourByGateway] =
    useState<PersonTimeOfDayByGateway | null>(null);

  /**
   * =========================
   * GRUPOS STATE
   * =========================
   */
  const [groupOptions, setGroupOptions] = useState<PersonGroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [groupSummary, setGroupSummary] =
    useState<PersonGroupPresenceSummary | null>(null);

  /**
   * =========================
   * GATEWAYS STATE
   * =========================
   */
  const [gatewayOptions, setGatewayOptions] = useState<DeviceOption[]>([]);
  const [gatewayUsage, setGatewayUsage] =
    useState<GatewayUsageSummary | null>(null);
  const [selectedGatewayId, setSelectedGatewayId] = useState<number | "">("");
  const [gatewayHourDist, setGatewayHourDist] =
    useState<GatewayTimeOfDayDistribution | null>(null);

  /**
   * Handlers de preset de intervalo
   */
  const handleQuickRangeChange = (range: QuickRangeKey) => {
    setQuickRange(range);

    // Atualiza os campos de data apenas para visualização
    if (range !== "custom") {
      const { from, to } = computeDateRange(range, fromDate, toDate);
      if (from) {
        setFromDate(from.toISOString().slice(0, 10));
      }
      if (to) {
        setToDate(to.toISOString().slice(0, 10));
      }
    }
  };

  /**
   * Helpers para montar query string base
   */
  const buildCommonParams = () => {
    const params = new URLSearchParams();

    const { from, to } = computeDateRange(quickRange, fromDate, toDate);

    if (from) params.append("from_ts", from.toISOString());
    if (to) params.append("to_ts", to.toISOString());

    if (minDurationSeconds !== undefined && minDurationSeconds !== null) {
      params.append("min_duration_seconds", String(minDurationSeconds));
    }
    return params;
  };

  /**
   * =========================
   * Fetch Overview
   * =========================
   */
  const fetchOverview = async () => {
    const params = buildCommonParams();
    const query = params.toString();
    const url = `/reports/overview${query ? `?${query}` : ""}`;
    const apiData = await apiGet<ReportsOverviewApi>(url);

    const normalized: ReportsOverview = {
      summary: apiData.summary,
      top_buildings: apiData.top_buildings ?? [],
      top_floors: apiData.top_floors ?? [],
      top_devices: apiData.top_devices ?? [],
      top_people: apiData.top_people ?? [],
      top_groups: apiData.top_groups ?? [],
      dwell_by_hour: apiData.dwell_by_hour ?? [],
      dwell_by_day: apiData.dwell_by_day ?? [],
    };

    setOverview(normalized);
  };

  /**
   * =========================
   * Fetch Pessoas + Relatórios por pessoa
   * =========================
   */
  const fetchPeopleOptions = async () => {
    const data = await apiGet<PersonOption[]>("/people");
    setPeopleOptions(data);
  };

  const fetchPersonReports = async () => {
    if (!selectedPersonId || selectedPersonId === "") return;

    const params = buildCommonParams();
    const commonQuery = params.toString();

    // Summary
    const summaryUrl = `/reports/person/${selectedPersonId}/summary${
      commonQuery ? `?${commonQuery}` : ""
    }`;
    const summary = await apiGet<PersonPresenceSummary>(summaryUrl);
    setPersonSummary(summary);

    // Distribuição agregada por hora
    const distUrl = `/reports/person/${selectedPersonId}/time-distribution/hour-of-day${
      commonQuery ? `?${commonQuery}` : ""
    }`;
    const dist = await apiGet<PersonTimeOfDayDistribution>(distUrl);
    setPersonHourDist(dist);

    // NOVO: distribuição por hora + gateway
    const byGwUrl = `/reports/person/${selectedPersonId}/time-distribution/hour-by-gateway${
      commonQuery ? `?${commonQuery}` : ""
    }`;
    const distByGw = await apiGet<PersonTimeOfDayByGateway>(byGwUrl);
    setPersonHourByGateway(distByGw);
  };

  /**
   * =========================
   * Fetch Grupos + Relatórios por grupo
   * =========================
   */
  const fetchGroupOptions = async () => {
    const data = await apiGet<PersonGroupOption[]>("/person-groups");
    setGroupOptions(data);
  };

  const fetchGroupReports = async () => {
    if (!selectedGroupId || selectedGroupId === "") return;

    const params = buildCommonParams();
    const query = params.toString();

    const url = `/reports/person-group/${selectedGroupId}/summary${
      query ? `?${query}` : ""
    }`;
    const summary = await apiGet<PersonGroupPresenceSummary>(url);
    setGroupSummary(summary);
  };

  /**
   * =========================
   * Fetch Gateways + Relatórios por gateway
   * =========================
   */
  const fetchGatewayOptions = async () => {
    const data = await apiGet<DeviceOption[]>("/devices");
    setGatewayOptions(
      data.map((d) => ({
        id: d.id,
        name: (d as any).name ?? (d as any).device_name ?? `Device ${d.id}`,
      }))
    );
  };

  const fetchGatewayUsageReports = async () => {
    const params = buildCommonParams();
    const query = params.toString();

    const url = `/reports/gateways/usage-summary${query ? `?${query}` : ""}`;
    const usage = await apiGet<GatewayUsageSummary>(url);
    setGatewayUsage(usage);

    if (!selectedGatewayId && usage.top_device_id) {
      setSelectedGatewayId(usage.top_device_id);
    }
  };

  const fetchGatewayTimeOfDay = async () => {
    if (!selectedGatewayId || selectedGatewayId === "") return;
    const params = buildCommonParams();
    const query = params.toString();

    const url = `/reports/gateways/${selectedGatewayId}/time-of-day${
      query ? `?${query}` : ""
    }`;
    const dist = await apiGet<GatewayTimeOfDayDistribution>(url);
    setGatewayHourDist(dist);
  };

  /**
   * =========================
   * Efeito inicial
   * =========================
   */

  const runInitialLoad = async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchPeopleOptions(),
        fetchGroupOptions(),
        fetchGatewayOptions(),
        fetchGatewayUsageReports(),
      ]);
    } catch (err: any) {
      console.error("Erro ao carregar relatórios:", err);
      setError("Falha ao carregar relatórios. Verifique o backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runInitialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchPersonReports(),
        fetchGroupReports(),
        fetchGatewayUsageReports(),
        fetchGatewayTimeOfDay(),
      ]);
    } catch (err: any) {
      console.error("Erro ao aplicar filtros:", err);
      setError("Falha ao aplicar filtros. Verifique o backend.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================
   * Dados derivados para gráficos
   * =========================
   */

  const personDevicesChartData = useMemo(() => {
    if (!personSummary) return [];
    return personSummary.dwell_by_device.map((d) => ({
      name: d.device_name ?? `Gateway ${d.device_id}`,
      dwellSeconds: d.total_dwell_seconds,
      sessions: d.sessions_count,
    }));
  }, [personSummary]);

  const personHourChartData = useMemo(() => {
    if (!personHourDist) return [];
    return personHourDist.buckets.map((b) => ({
      hour: `${b.hour}h`,
      dwellSeconds: b.total_dwell_seconds,
      sessions: b.sessions_count,
    }));
  }, [personHourDist]);

  /**
   * pessoa x hora x gateway (barras empilhadas)
   */
  const personHourByGatewayChart = useMemo(() => {
    if (!personHourByGateway) {
      return {
        data: [] as any[],
        gateways: [] as { id: number; name: string }[],
        keyToName: {} as Record<string, string>,
      };
    }

    const buckets = personHourByGateway.buckets;

    const gatewayMap = new Map<number, string>();
    for (const b of buckets) {
      gatewayMap.set(b.device_id, b.device_name ?? `Gateway ${b.device_id}`);
    }

    const gateways = Array.from(gatewayMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    const hourMap: Record<number, any> = {};

    for (const b of buckets) {
      const h = b.hour;
      if (!hourMap[h]) {
        hourMap[h] = { hour: `${h}h` };
        // inicializa colunas com 0
        for (const [gwId] of gatewayMap.entries()) {
          hourMap[h][`gw_${gwId}`] = 0;
        }
      }
      hourMap[h][`gw_${b.device_id}`] += b.total_dwell_seconds;
    }

    const data = Object.entries(hourMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([_, value]) => value);

    const keyToName: Record<string, string> = {};
    for (const gw of gateways) {
      keyToName[`gw_${gw.id}`] = gw.name;
    }

    return { data, gateways, keyToName };
  }, [personHourByGateway]);

  const groupDevicesChartData = useMemo(() => {
    if (!groupSummary) return [];
    return groupSummary.dwell_by_device.map((d) => ({
      name: d.device_name ?? `Gateway ${d.device_id}`,
      dwellSeconds: d.total_dwell_seconds,
      sessions: d.sessions_count,
      people: d.unique_people_count,
    }));
  }, [groupSummary]);

  const groupPeopleChartData = useMemo(() => {
    if (!groupSummary) return [];
    return groupSummary.dwell_by_person.map((p) => ({
      name: p.person_full_name,
      dwellSeconds: p.total_dwell_seconds,
      sessions: p.sessions_count,
    }));
  }, [groupSummary]);

  const gatewayUsageChartData = useMemo(() => {
    if (!gatewayUsage) return [];
    return gatewayUsage.gateways.map((g) => ({
      name: g.device_name ?? `Gateway ${g.device_id}`,
      dwellSeconds: g.total_dwell_seconds,
      sessions: g.sessions_count,
      people: g.unique_people_count,
    }));
  }, [gatewayUsage]);

  const gatewayHourChartData = useMemo(() => {
    if (!gatewayHourDist) return [];
    return gatewayHourDist.buckets.map((b) => ({
      hour: `${b.hour}h`,
      dwellSeconds: b.total_dwell_seconds,
      sessions: b.sessions_count,
      people: b.unique_people_count,
    }));
  }, [gatewayHourDist]);

  /**
   * =========================
   * Render
   * =========================
   */

  return (
    <div className="space-y-6">
      {/* TÍTULO + FILTROS GLOBAIS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">
            Relatórios de Presença
          </h2>
          <p className="text-sm text-slate-400">
            Explore métricas de permanência por pessoa, grupo e gateway.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Período rápido</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "last_1h", label: "Última 1h" },
                  { key: "last_24h", label: "Últimas 24h" },
                  { key: "last_7d", label: "Últimos 7 dias" },
                  { key: "last_15d", label: "Últimos 15 dias" },
                  { key: "last_30d", label: "Últimos 30 dias" },
                  { key: "custom", label: "Personalizado" },
                ] as { key: QuickRangeKey; label: string }[]
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleQuickRangeChange(item.key)}
                  className={`px-2 py-1 rounded-full text-xs border transition ${
                    quickRange === item.key
                      ? "bg-sv-accent text-white border-sv-accent"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:border-sv-accent/60"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">De (data)</label>
            <input
              type="date"
              className={`bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50 ${
                quickRange !== "custom" ? "opacity-60 cursor-not-allowed" : ""
              }`}
              value={fromDate}
              disabled={quickRange !== "custom"}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Até (data)</label>
            <input
              type="date"
              className={`bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50 ${
                quickRange !== "custom" ? "opacity-60 cursor-not-allowed" : ""
              }`}
              value={toDate}
              disabled={quickRange !== "custom"}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">
              Duração mínima (segundos)
            </label>
            <input
              type="number"
              min={0}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50 w-32"
              value={minDurationSeconds ?? ""}
              onChange={(e) =>
                setMinDurationSeconds(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
            />
          </div>

          <button
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-sv-accent text-white hover:bg-sv-accent/90 disabled:opacity-60"
          >
            {loading ? "Carregando..." : "Aplicar filtros"}
          </button>
        </div>
      </div>

      {/* ERRO */}
      {error && (
        <div className="border border-red-500/60 bg-red-950/40 text-red-200 text-sm px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* ABAS */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex flex-wrap gap-3" aria-label="Tabs">
          {[
            { key: "overview", label: "Overview" },
            { key: "person", label: "Por pessoa" },
            { key: "group", label: "Por grupo" },
            { key: "gateway", label: "Por gateway" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`border-b-2 px-3 py-2 text-xs font-medium ${
                activeTab === tab.key
                  ? "border-sv-accent text-slate-50"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ABA OVERVIEW */}
      {activeTab === "overview" && overview && (
        <div className="space-y-6">
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase text-slate-400 mb-1">
                Sessões de presença
              </div>
              <div className="text-2xl font-semibold text-slate-50">
                {overview.summary.total_sessions}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {overview.summary.total_unique_tags} tags •{" "}
                {overview.summary.total_unique_devices} gateways
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase text-slate-400 mb-1">
                Tempo total de permanência
              </div>
              <div className="text-2xl font-semibold text-slate-50">
                {formatSeconds(overview.summary.total_dwell_seconds)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {overview.summary.total_dwell_seconds} segundos
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase text-slate-400 mb-1">
                Permanência média
              </div>
              <div className="text-2xl font-semibold text-slate-50">
                {formatSeconds(overview.summary.avg_dwell_seconds || 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                por sessão de presença
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase text-slate-400 mb-1">
                Janela analisada
              </div>
              <div className="text-xs text-slate-200">
                <div>
                  <span className="text-slate-500">Início:</span>{" "}
                  {formatDateTime(overview.summary.first_session_at)}
                </div>
                <div>
                  <span className="text-slate-500">Fim:</span>{" "}
                  {formatDateTime(overview.summary.last_session_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Dwell por hora / dia (tabelas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-50">
                  Dwell por hora
                </h3>
                <span className="text-xs text-slate-500">
                  Buckets de date_trunc(&quot;hour&quot;)
                </span>
              </div>
              {overview.dwell_by_hour.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum dado para o período/critério selecionado.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-slate-300">
                    <thead className="text-[11px] uppercase text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 text-left">Hora</th>
                        <th className="py-1.5 text-right">Sessões</th>
                        <th className="py-1.5 text-right">
                          Dwell total (s)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.dwell_by_hour.map((b) => (
                        <tr
                          key={b.bucket}
                          className="border-b border-slate-800/60"
                        >
                          <td className="py-1.5">
                            {formatDateTime(b.bucket)}
                          </td>
                          <td className="py-1.5 text-right">
                            {b.total_sessions}
                          </td>
                          <td className="py-1.5 text-right">
                            {b.total_dwell_seconds}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-50">
                  Dwell por dia
                </h3>
                <span className="text-xs text-slate-500">
                  Buckets de date_trunc(&quot;day&quot;)
                </span>
              </div>
              {overview.dwell_by_day.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum dado para o período/critério selecionado.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-slate-300">
                    <thead className="text-[11px] uppercase text-slate-500 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 text-left">Dia</th>
                        <th className="py-1.5 text-right">Sessões</th>
                        <th className="py-1.5 text-right">
                          Dwell total (s)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.dwell_by_day.map((b) => (
                        <tr
                          key={b.bucket}
                          className="border-b border-slate-800/60"
                        >
                          <td className="py-1.5">
                            {formatDateTime(b.bucket)}
                          </td>
                          <td className="py-1.5 text-right">
                            {b.total_sessions}
                          </td>
                          <td className="py-1.5 text-right">
                            {b.total_dwell_seconds}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RANKINGS */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Buildings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                Top Prédios por permanência
              </h3>
              {overview.top_buildings.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum prédio encontrado para o filtro.
                </div>
              ) : (
                <div className="space-y-1">
                  {overview.top_buildings.map((b) => (
                    <div
                      key={`${b.building_id ?? "none"}`}
                      className="flex items-center justify-between text-xs bg-slate-950/40 border border-slate-800/60 rounded-md px-3 py-1.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-slate-100">
                          {b.building_name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {b.total_sessions} sessões
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {formatSeconds(b.total_dwell_seconds)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Devices */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                Top Gateways por permanência
              </h3>
              {overview.top_devices.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum gateway encontrado para o filtro.
                </div>
              ) : (
                <div className="space-y-1">
                  {overview.top_devices.map((d) => (
                    <div
                      key={d.device_id}
                      className="flex items-center justify-between text-xs bg-slate-950/40 border border-slate-800/60 rounded-md px-3 py-1.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-slate-100">
                          {d.device_name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {d.total_sessions} sessões
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {formatSeconds(d.total_dwell_seconds)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grupos (resumo) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-50 mb-2">
                Top Grupos por permanência
              </h3>
              {overview.top_groups.length === 0 ? (
                <div className="text-xs text-slate-500">
                  Nenhum grupo encontrado para o filtro.
                </div>
              ) : (
                <div className="space-y-1">
                  {overview.top_groups.map((g) => (
                    <div
                      key={g.group_id}
                      className="flex flex-col bg-slate-950/40 border border-slate-800/60 rounded-md px-3 py-2 text-xs"
                    >
                      <span className="text-slate-100 mb-0.5">
                        {g.group_name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {g.total_sessions} sessões
                      </span>
                      <span className="text-[11px] text-slate-300">
                        {formatSeconds(g.total_dwell_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA PESSOA */}
      {activeTab === "person" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex flex-col md:w-64">
              <label className="text-xs text-slate-400 mb-1">Pessoa</label>
              <select
                value={selectedPersonId}
                onChange={(e) =>
                  setSelectedPersonId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50"
              >
                <option value="">Selecione uma pessoa</option>
                {peopleOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchPersonReports}
              disabled={loading || !selectedPersonId}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-sv-accent text-white hover:bg-sv-accent/90 disabled:opacity-60"
            >
              Atualizar relatórios da pessoa
            </button>
          </div>

          {!personSummary && (
            <div className="text-sm text-slate-400">
              Selecione uma pessoa e clique em{" "}
              <span className="font-semibold text-sv-accent">
                Atualizar relatórios da pessoa
              </span>
              .
            </div>
          )}

          {personSummary && (
            <div className="space-y-6">
              {/* Cards da pessoa */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Pessoa
                  </div>
                  <div className="text-sm font-semibold text-slate-50">
                    {personSummary.person_full_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ID {personSummary.person_id}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Tempo total no período
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {formatSeconds(personSummary.total_dwell_seconds)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {personSummary.total_sessions} sessões
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Primeira sessão
                  </div>
                  <div className="text-xs text-slate-200">
                    {formatDateTime(personSummary.first_session_at)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Início</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Última sessão
                  </div>
                  <div className="text-xs text-slate-200">
                    {formatDateTime(personSummary.last_session_at)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Fim</div>
                </div>
              </div>

              {/* Tempo de permanência por gateway */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    Tempo de permanência por gateway
                  </h3>
                  <span className="text-xs text-slate-500">
                    Top gateways onde a pessoa ficou mais
                  </span>
                </div>
                {personDevicesChartData.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhum dado de gateway para esta pessoa no período.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={personDevicesChartData}
                        margin={{ top: 10, right: 20, bottom: 40, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_COLORS.grid}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v) => `${Math.round(v / 60)}m`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1e293b",
                            fontSize: 12,
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "dwellSeconds") {
                              return [formatSeconds(value as number), "Tempo"];
                            }
                            if (name === "sessions") {
                              return [value, "Sessões"];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-xs text-slate-300">
                              {value === "dwellSeconds"
                                ? "Tempo (s)"
                                : value === "sessions"
                                ? "Sessões"
                                : value}
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="dwellSeconds"
                          name="Tempo (s)"
                          fill={CHART_COLORS.dwell}
                        />
                        <Bar
                          dataKey="sessions"
                          name="Sessões"
                          fill={CHART_COLORS.sessions}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Distribuição por horário do dia por gateway (24h) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    Tempo por hora e por gateway
                  </h3>
                  <span className="text-xs text-slate-500">
                    Quanto tempo a pessoa ficou em cada gateway ao longo das 24h
                  </span>
                </div>
                {personHourByGatewayChart.data.length === 0 ||
                personHourByGatewayChart.gateways.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhum dado de horário/gateway para esta pessoa no período.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={personHourByGatewayChart.data}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_COLORS.grid}
                        />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v) => `${Math.round(v / 60)}m`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1e293b",
                            fontSize: 12,
                          }}
                          formatter={(value: any, name: string) => {
                            const label =
                              personHourByGatewayChart.keyToName[name] ?? name;
                            return [formatSeconds(value as number), label];
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-xs text-slate-300">
                              {personHourByGatewayChart.keyToName[value] ??
                                value}
                            </span>
                          )}
                        />
                        {personHourByGatewayChart.gateways.map((gw, idx) => (
                          <Bar
                            key={gw.id}
                            dataKey={`gw_${gw.id}`}
                            stackId="a"
                            name={gw.name}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA GRUPO */}
      {activeTab === "group" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex flex-col md:w-64">
              <label className="text-xs text-slate-400 mb-1">
                Grupo de pessoas
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) =>
                  setSelectedGroupId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50"
              >
                <option value="">Selecione um grupo</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchGroupReports}
              disabled={loading || !selectedGroupId}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-sv-accent text-white hover:bg-sv-accent/90 disabled:opacity-60"
            >
              Atualizar relatórios do grupo
            </button>
          </div>

          {!groupSummary && (
            <div className="text-sm text-slate-400">
              Selecione um grupo e clique em{" "}
              <span className="font-semibold text-sv-accent">
                Atualizar relatórios do grupo
              </span>
              .
            </div>
          )}

          {groupSummary && (
            <div className="space-y-6">
              {/* Cards do grupo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Grupo
                  </div>
                  <div className="text-sm font-semibold text-slate-50">
                    {groupSummary.group_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {groupSummary.total_unique_people} pessoas distintas
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Tempo total do grupo
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {formatSeconds(groupSummary.total_dwell_seconds)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {groupSummary.total_sessions} sessões
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Primeira sessão
                  </div>
                  <div className="text-xs text-slate-200">
                    {formatDateTime(groupSummary.first_session_at)}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Última sessão
                  </div>
                  <div className="text-xs text-slate-200">
                    {formatDateTime(groupSummary.last_session_at)}
                  </div>
                </div>
              </div>

              {/* Dwell por gateway (grupo) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    Gateways mais usados pelo grupo
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tempo, sessões e pessoas por gateway
                  </span>
                </div>
                {groupDevicesChartData.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhum gateway para este grupo no período.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={groupDevicesChartData}
                        margin={{ top: 10, right: 20, bottom: 40, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_COLORS.grid}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v) => `${Math.round(v / 60)}m`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1e293b",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-xs text-slate-300">
                              {value === "dwellSeconds"
                                ? "Tempo (s)"
                                : value === "sessions"
                                ? "Sessões"
                                : value === "people"
                                ? "Pessoas"
                                : value}
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="dwellSeconds"
                          name="Tempo (s)"
                          fill={CHART_COLORS.dwell}
                        />
                        <Bar
                          dataKey="sessions"
                          name="Sessões"
                          fill={CHART_COLORS.sessions}
                        />
                        <Bar
                          dataKey="people"
                          name="Pessoas"
                          fill={CHART_COLORS.people}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Dwell por pessoa (pizza) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    Distribuição de tempo por pessoa no grupo
                  </h3>
                  <span className="text-xs text-slate-500">
                    Participação relativa de cada pessoa
                  </span>
                </div>
                {groupPeopleChartData.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhuma pessoa com presença registrada no grupo.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1e293b",
                            fontSize: 12,
                          }}
                          formatter={(value: any) => [
                            formatSeconds(value as number),
                            "Tempo",
                          ]}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value) => (
                            <span className="text-xs text-slate-300">
                              {value}
                            </span>
                          )}
                        />
                        <Pie
                          data={groupPeopleChartData}
                          dataKey="dwellSeconds"
                          nameKey="name"
                          cx="40%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) =>
                            entry.name.length > 15
                              ? `${entry.name.slice(0, 15)}…`
                              : entry.name
                          }
                          labelLine={false}
                        >
                          {groupPeopleChartData.map((_, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA GATEWAY */}
      {activeTab === "gateway" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex flex-col md:w-64">
              <label className="text-xs text-slate-400 mb-1">Gateway</label>
              <select
                value={selectedGatewayId}
                onChange={(e) =>
                  setSelectedGatewayId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-50"
              >
                <option value="">Selecione um gateway</option>
                {gatewayOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={async () => {
                await fetchGatewayUsageReports();
                await fetchGatewayTimeOfDay();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-sv-accent text-white hover:bg-sv-accent/90 disabled:opacity-60"
            >
              Atualizar relatórios de gateways
            </button>
          </div>

          {!gatewayUsage && (
            <div className="text-sm text-slate-400">
              Nenhum dado de gateway carregado ainda.
            </div>
          )}

          {gatewayUsage && (
            <div className="space-y-6">
              {/* Cards gerais de gateways */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Gateways com presença
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {gatewayUsage.total_devices}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Sessões registradas
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {gatewayUsage.total_sessions}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Tempo total em todos gateways
                  </div>
                  <div className="text-2xl font-semibold text-slate-50">
                    {formatSeconds(gatewayUsage.total_dwell_seconds)}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">
                    Gateway destaque (mais pessoas)
                  </div>
                  <div className="text-xs text-slate-200">
                    {gatewayUsage.top_device_id
                      ? gatewayUsage.gateways.find(
                          (g) => g.device_id === gatewayUsage.top_device_id
                        )?.device_name ?? `Gateway ${gatewayUsage.top_device_id}`
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Ranking de gateways */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    Gateways mais movimentados
                  </h3>
                  <span className="text-xs text-slate-500">
                    Pessoas, sessões e tempo
                  </span>
                </div>
                {gatewayUsageChartData.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nenhum gateway no período.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={gatewayUsageChartData}
                        margin={{ top: 10, right: 20, bottom: 60, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_COLORS.grid}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(v) => `${Math.round(v / 60)}m`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1e293b",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-xs text-slate-300">
                              {value === "dwellSeconds"
                                ? "Tempo (s)"
                                : value === "sessions"
                                ? "Sessões"
                                : value === "people"
                                ? "Pessoas"
                                : value}
                            </span>
                          )}
                        />
                        <Bar
                          dataKey="people"
                          name="Pessoas"
                          fill={CHART_COLORS.people}
                        />
                        <Bar
                          dataKey="sessions"
                          name="Sessões"
                          fill={CHART_COLORS.sessions}
                        />
                        <Bar
                          dataKey="dwellSeconds"
                          name="Tempo (s)"
                          fill={CHART_COLORS.dwell}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Distribuição por horário do gateway selecionado (focado em pessoas) */}
              {selectedGatewayId && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-50">
                      Distribuição por horário do dia (gateway selecionado)
                    </h3>
                    <span className="text-xs text-slate-500">
                      Pessoas distintas ao longo das 24h
                    </span>
                  </div>
                  {gatewayHourChartData.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Nenhum dado de horário para este gateway.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gatewayHourChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_COLORS.grid}
                          />
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            tickFormatter={(v) => `${v} pessoas`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderColor: "#1e293b",
                              fontSize: 12,
                            }}
                            formatter={(value: any) => [
                              value,
                              "Pessoas distintas",
                            ]}
                          />
                          <Legend
                            formatter={() => (
                              <span className="text-xs text-slate-300">
                                Pessoas distintas no gateway
                              </span>
                            )}
                          />
                          <Bar
                            dataKey="people"
                            name="Pessoas"
                            fill={CHART_COLORS.people}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

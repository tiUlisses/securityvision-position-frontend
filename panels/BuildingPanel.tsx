// src/features/reports/panels/BuildingPanel.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Building } from "../../../api/types";
import ReportCard from "../components/ReportCard";
import type {
  AlertsSummaryReport,
  BuildingSummaryReport,
  Granularity,
  TimeBucket,
} from "../types";
import { reportsApi } from "../api";
import { formatSeconds } from "../utils";

type Props = {
  buildings: Building[];
  selectedBuildingId: number | null;
  onSelectBuildingId: (id: number | null) => void;
  from: Date;
  to: Date;
  minDurationSeconds: number;
};

export default function BuildingPanel({
  buildings,
  selectedBuildingId,
  onSelectBuildingId,
  from,
  to,
  minDurationSeconds,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("day");
  const [summary, setSummary] = useState<BuildingSummaryReport | null>(null);
  const [tod, setTod] = useState<TimeBucket[] | null>(null);
  const [calendar, setCalendar] = useState<TimeBucket[] | null>(null);
  const [alerts, setAlerts] = useState<AlertsSummaryReport | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!selectedBuildingId) {
        setSummary(null);
        setTod(null);
        setCalendar(null);
        setAlerts(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const params = {
          from_ts: from.toISOString(),
          to_ts: to.toISOString(),
          min_duration_seconds: minDurationSeconds || undefined,
        };

        const [s, t, c, a] = await Promise.all([
          reportsApi.getBuildingSummary(selectedBuildingId, params),
          reportsApi.getBuildingTimeOfDay(selectedBuildingId, {
            from_ts: params.from_ts,
            to_ts: params.to_ts,
          }),
          reportsApi.getBuildingCalendar(selectedBuildingId, {
            from_ts: params.from_ts,
            to_ts: params.to_ts,
            granularity,
          }),
          reportsApi.getBuildingAlertsSummary(selectedBuildingId, {
            from_ts: params.from_ts,
            to_ts: params.to_ts,
          }),
        ]);

        setSummary(s);
        setTod(t);
        setCalendar(c);
        setAlerts(a);
      } catch (err) {
        console.error(err);
        setError((err as Error)?.message ?? "Erro ao carregar relatórios do prédio.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [selectedBuildingId, from, to, minDurationSeconds, granularity]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  const todChart = useMemo(() => {
    return (tod ?? []).map((b) => ({
      bucket: new Date(b.bucket_start).toLocaleString(),
      dwell_min: Math.round((b.total_dwell_seconds / 60) * 10) / 10,
      unique_people: b.unique_people_count,
    }));
  }, [tod]);

  const calChart = useMemo(() => {
    return (calendar ?? []).map((b) => ({
      bucket: new Date(b.bucket_start).toLocaleDateString(),
      dwell_min: Math.round((b.total_dwell_seconds / 60) * 10) / 10,
      unique_people: b.unique_people_count,
    }));
  }, [calendar]);

  const alertsChart = useMemo(() => {
    return (alerts?.by_type ?? []).map((x) => ({
      type: x.event_type,
      alerts: x.alerts_count,
    }));
  }, [alerts]);

  return (
    <div className="flex flex-col gap-4">
      <ReportCard
        title="Filtro: Prédio"
        subtitle="Selecione um prédio para ver o consolidado, distribuição temporal e alertas."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Prédio
            </label>
            <select
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={selectedBuildingId ?? ""}
              onChange={(e) =>
                onSelectBuildingId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Selecione...</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Granularidade (calendário)
            </label>
            <select
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          </div>
        </div>
      </ReportCard>

      {error && (
        <div className="rounded border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      {!selectedBuildingId && (
        <div className="rounded border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
          Selecione um prédio para carregar os relatórios.
        </div>
      )}

      {selectedBuildingId && (
        <>
          <ReportCard
            title={`Resumo do prédio${selectedBuilding ? `: ${selectedBuilding.name}` : ""}`}
            subtitle={loading ? "Carregando..." : "Consolidado e TOP gateways"}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <MiniStat label="Sessões" value={summary?.total_sessions ?? "-"} />
              <MiniStat
                label="Tempo total"
                value={formatSeconds(summary?.total_dwell_seconds)}
              />
              <MiniStat
                label="Pessoas únicas"
                value={summary?.unique_people_count ?? "-"}
              />
              <MiniStat
                label="Dwell médio"
                value={formatSeconds(summary?.avg_dwell_seconds ?? null)}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-slate-800 bg-slate-900 p-3">
                <div className="text-xs font-semibold text-slate-200">
                  TOP gateways por sessões
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-300">
                  {(summary?.top_gateways_by_sessions ?? []).map((x) => (
                    <div key={x.device_id ?? Math.random()} className="flex justify-between gap-2">
                      <span className="truncate">
                        {x.device_name ?? (x.device_id ? `Gateway ${x.device_id}` : "-")}
                      </span>
                      <span className="text-slate-400">{x.sessions_count}</span>
                    </div>
                  ))}
                  {!loading && (summary?.top_gateways_by_sessions?.length ?? 0) === 0 && (
                    <div className="text-slate-500">Sem dados no período.</div>
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-900 p-3">
                <div className="text-xs font-semibold text-slate-200">
                  TOP gateways por permanência
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-300">
                  {(summary?.top_gateways_by_dwell ?? []).map((x) => (
                    <div key={x.device_id ?? Math.random()} className="flex justify-between gap-2">
                      <span className="truncate">
                        {x.device_name ?? (x.device_id ? `Gateway ${x.device_id}` : "-")}
                      </span>
                      <span className="text-slate-400">
                        {formatSeconds(x.total_dwell_seconds)}
                      </span>
                    </div>
                  ))}
                  {!loading && (summary?.top_gateways_by_dwell?.length ?? 0) === 0 && (
                    <div className="text-slate-500">Sem dados no período.</div>
                  )}
                </div>
              </div>
            </div>
          </ReportCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard
              title="Distribuição por hora"
              subtitle="Tempo total (min) e pessoas únicas por bucket"
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={todChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="dwell_min" name="Tempo (min)" />
                    <Bar dataKey="unique_people" name="Pessoas únicas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>

            <ReportCard
              title="Calendário"
              subtitle="Tempo total (min) e pessoas únicas por bucket"
              right={
                <span className="text-[11px] text-slate-400">
                  {granularity.toUpperCase()}
                </span>
              }
            >
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dwell_min" name="Tempo (min)" />
                    <Line type="monotone" dataKey="unique_people" name="Pessoas únicas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>
          </div>

          <ReportCard
            title="Alertas no período"
            subtitle={alerts ? `Total: ${alerts.total_alerts}` : "-"}
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertsChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="alerts" name="Alertas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded border border-slate-800 bg-slate-900 p-3">
                <div className="text-xs font-semibold text-slate-200">Resumo</div>
                <div className="mt-2 space-y-1 text-xs text-slate-300">
                  {alerts?.by_type?.map((x) => (
                    <div key={x.event_type} className="flex justify-between gap-2">
                      <span className="truncate">{x.event_type}</span>
                      <span className="text-slate-400">{x.alerts_count}</span>
                    </div>
                  ))}
                  {!loading && (alerts?.by_type?.length ?? 0) === 0 && (
                    <div className="text-slate-500">Sem alertas no período.</div>
                  )}
                </div>
              </div>
            </div>
          </ReportCard>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100">
        {String(value)}
      </div>
    </div>
  );
}

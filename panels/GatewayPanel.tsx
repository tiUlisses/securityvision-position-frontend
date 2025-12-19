// src/features/reports/panels/GatewayPanel.tsx
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

import type { Device } from "../../../api/types";
import ReportCard from "../components/ReportCard";
import { reportsApi } from "../api";
import type {
  AlertsSummaryReport,
  GatewayOccupancyReport,
  GatewayTimeOfDayDistribution,
  GatewayUsageSummary,
} from "../types";
import { formatSeconds } from "../utils";

type Props = {
  from: Date;
  to: Date;
  gateways: Device[];
  selectedGatewayId: number | null;
  onSelectGatewayId: (id: number | null) => void;
};

export default function GatewayPanel({
  from,
  to,
  gateways,
  selectedGatewayId,
  onSelectGatewayId,
}: Props) {
  const [summary, setSummary] = useState<GatewayUsageSummary | null>(null);
  const [tod, setTod] = useState<GatewayTimeOfDayDistribution | null>(null);
  const [occ, setOcc] = useState<GatewayOccupancyReport | null>(null);
  const [alerts, setAlerts] = useState<AlertsSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = selectedGatewayId;
    if (!id) {
      setSummary(null);
      setTod(null);
      setOcc(null);
      setAlerts(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = { from_ts: from.toISOString(), to_ts: to.toISOString() };

        const [sumRes, todRes, occRes, alRes] = await Promise.all([
          reportsApi.getGatewayUsageSummary({ ...params, device_id: id }),
          reportsApi.getGatewayTimeOfDay(id, params),
          reportsApi.getGatewayOccupancy(id, params),
          reportsApi.getGatewayAlertsSummary(id, params),
        ]);

        if (cancelled) return;
        setSummary(sumRes);
        setTod(todRes);
        setOcc(occRes);
        setAlerts(alRes);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError((e as Error)?.message ?? "Erro ao carregar relatórios do gateway.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGatewayId, from, to]);

  const selectedGateway = useMemo(() => {
    if (!selectedGatewayId) return null;
    return gateways.find((g) => g.id === selectedGatewayId) ?? null;
  }, [gateways, selectedGatewayId]);

  const summaryRow = summary?.gateways?.[0] ?? null;

  const timeOfDaySeries = useMemo(() => {
    const buckets = tod?.buckets ?? [];
    return buckets.map((b) => ({
      hour: String(b.hour).padStart(2, "0"),
      people: b.unique_people_count,
      dwell_min: Math.round((b.total_dwell_seconds / 60) * 10) / 10,
    }));
  }, [tod]);

  const occupancySeries = useMemo(() => {
    const buckets = occ?.buckets ?? [];
    return buckets.map((b) => ({
      bucket: new Date(b.bucket_start).toLocaleString(),
      people: b.unique_people_count,
      tags: b.unique_tags_count,
      dwell_min: Math.round((b.total_dwell_seconds / 60) * 10) / 10,
    }));
  }, [occ]);

  const alertsByType = useMemo(() => {
    const by = alerts?.by_type ?? [];
    return by.map((x) => ({ name: x.event_type, count: x.alerts_count }));
  }, [alerts]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-100">Gateway</h2>
          <p className="text-[11px] text-slate-400">
            Ocupação (pessoas únicas por hora), distribuição por hora do dia e alertas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
            value={selectedGatewayId ?? ""}
            onChange={(e) => onSelectGatewayId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Selecione um gateway...</option>
            {gateways.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || g.mac_address || `Gateway #${g.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-xs text-slate-400">Carregando...</div>}
      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Resumo"
          subtitle={selectedGateway ? selectedGateway.name || selectedGateway.mac_address || `Gateway #${selectedGateway.id}` : ""}
        >
          {!summaryRow ? (
            <div className="text-xs text-slate-500">Selecione um gateway.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <MiniStat label="Pessoas únicas" value={summaryRow.unique_people_count} />
              <MiniStat label="Sessões" value={summaryRow.sessions_count} />
              <MiniStat label="Tempo total" value={formatSeconds(summaryRow.total_dwell_seconds)} />
              <MiniStat
                label="Média por sessão"
                value={
                  summaryRow.sessions_count > 0
                    ? formatSeconds(Math.round(summaryRow.total_dwell_seconds / summaryRow.sessions_count))
                    : "-"
                }
              />
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Estatísticas de permanência"
          subtitle="(duração das sessões no período)"
        >
          {!occ ? (
            <div className="text-xs text-slate-500">Selecione um gateway.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniStat label="Média" value={formatSeconds(occ.avg_dwell_seconds ?? null)} />
              <MiniStat label="P50" value={formatSeconds(occ.p50_dwell_seconds ?? null)} />
              <MiniStat label="P95" value={formatSeconds(occ.p95_dwell_seconds ?? null)} />
            </div>
          )}
        </ReportCard>

        <ReportCard title="Distribuição por hora do dia" subtitle="Pessoas únicas e minutos de permanência." >
          {!tod ? (
            <div className="text-xs text-slate-500">Selecione um gateway.</div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeOfDaySeries} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="people" name="Pessoas" />
                  <Bar dataKey="dwell_min" name="Minutos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Ocupação por bucket"
          subtitle={
            occ?.peak
              ? `Pico: ${occ.peak.unique_people_count} pessoas em ${new Date(occ.peak.bucket_start).toLocaleString()}`
              : ""
          }
        >
          {!occ ? (
            <div className="text-xs text-slate-500">Selecione um gateway.</div>
          ) : occupancySeries.length === 0 ? (
            <div className="text-xs text-slate-500">Sem buckets no período.</div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={occupancySeries} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="people" name="Pessoas" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>

        <ReportCard title="Alertas" subtitle="Contagem por tipo (no período)." >
          {!alerts ? (
            <div className="text-xs text-slate-500">Selecione um gateway.</div>
          ) : alertsByType.length === 0 ? (
            <div className="text-xs text-slate-500">Sem alertas no período.</div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertsByType} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Alertas" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-[11px] text-slate-400">
                Total: <span className="font-semibold">{alerts.total_alerts}</span>
              </div>
            </div>
          )}
        </ReportCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100">{String(value)}</div>
    </div>
  );
}

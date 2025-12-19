// src/features/reports/panels/OverviewPanel.tsx
import { useEffect, useMemo, useState } from "react";
import ReportCard from "../components/ReportCard";
import type { ReportsOverviewResponse } from "../types";
import { reportsApi } from "../api";
import { formatSeconds } from "../utils";

type Props = {
  from: Date;
  to: Date;
};

export default function OverviewPanel({ from, to }: Props) {
  const [data, setData] = useState<ReportsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reportsApi.getOverview({ from_ts: from.toISOString(), to_ts: to.toISOString() });
        if (!mounted) return;
        setData(res);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message ?? "Erro ao carregar overview.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [from, to]);

  const summary = data?.summary;

  const cards = useMemo(
    () => [
      { label: "Sessões", value: summary?.total_sessions ?? 0 },
      { label: "Dwell total", value: formatSeconds(summary?.total_dwell_seconds ?? 0) },
      { label: "Tags únicas", value: summary?.total_unique_tags ?? 0 },
      { label: "Gateways únicos", value: summary?.total_unique_devices ?? 0 },
      { label: "Dwell médio", value: formatSeconds(Math.round(summary?.avg_dwell_seconds ?? 0)) },
    ],
    [summary]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ReportCard
        title="Visão geral"
        subtitle="Resumo de presença no período selecionado."
        right={
          loading ? <span className="text-[11px] text-slate-400">Carregando...</span> : null
        }
      >
        {error ? <div className="text-xs text-rose-400">{error}</div> : null}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded border border-slate-800 bg-slate-900 px-3 py-2"
            >
              <div className="text-[11px] text-slate-400">{c.label}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-100">{c.value}</div>
            </div>
          ))}
        </div>
      </ReportCard>

      <ReportCard title="TOP prédios" subtitle="Ordenado por dwell total.">
        <TopList
          loading={loading}
          items={(data?.top_buildings ?? []).map((x) => ({
            id: x.building_id ?? 0,
            name: x.building_name ?? "Sem prédio",
            sessions: x.total_sessions,
            dwell: x.total_dwell_seconds,
          }))}
        />
      </ReportCard>

      <ReportCard title="TOP pessoas" subtitle="Ordenado por dwell total.">
        <TopList
          loading={loading}
          items={(data?.top_people ?? []).map((x) => ({
            id: x.person_id ?? 0,
            name: x.person_name ?? `Pessoa #${x.person_id}`,
            sessions: x.total_sessions,
            dwell: x.total_dwell_seconds,
          }))}
        />
      </ReportCard>
    </div>
  );
}

function TopList({
  loading,
  items,
}: {
  loading: boolean;
  items: Array<{ id: number; name: string; sessions: number; dwell: number }>;
}) {
  if (loading) {
    return <div className="text-xs text-slate-400">Carregando...</div>;
  }

  if (!items.length) {
    return <div className="text-xs text-slate-500">Sem dados para o período.</div>;
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 10).map((it) => (
        <div key={it.id + it.name} className="rounded border border-slate-800 bg-slate-900 px-3 py-2">
          <div className="text-xs font-medium text-slate-100">{it.name}</div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div>
              <span className="font-semibold">Sessões:</span> {it.sessions}
            </div>
            <div>
              <span className="font-semibold">Dwell:</span> {formatSeconds(it.dwell)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

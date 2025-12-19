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

import type { Person } from "../../../api/types";
import ReportCard from "../components/ReportCard";
import type {
  Granularity,
  PersonAlertsReport,
  PersonPresenceSummary,
  PersonTimeDistributionCalendar,
  PersonTimeOfDayByGateway,
} from "../types";
import { reportsApi } from "../api";
import { formatSeconds } from "../utils";
import { AXIS_TICK, CHART_COLORS, GRID_STROKE, TOOLTIP_STYLE } from "../chartTheme";

type Props = {
  people: Person[];
  selectedPersonId: number | null;
  onSelectPerson: (id: number | null) => void;

  from: Date;
  to: Date;
  minDurationSeconds: number;
};

export default function PersonPanel({
  people,
  selectedPersonId,
  onSelectPerson,
  from,
  to,
  minDurationSeconds,
}: Props) {
  const person = useMemo(
    () => people.find((p) => p.id === selectedPersonId) ?? null,
    [people, selectedPersonId]
  );

  const [summary, setSummary] = useState<PersonPresenceSummary | null>(null);
  const [hourByGateway, setHourByGateway] = useState<PersonTimeOfDayByGateway | null>(null);
  const [calendar, setCalendar] = useState<PersonTimeDistributionCalendar | null>(null);
  const [alerts, setAlerts] = useState<PersonAlertsReport | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("day");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!person?.id) {
      setSummary(null);
      setHourByGateway(null);
      setCalendar(null);
      setAlerts(null);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const common = {
          from_ts: from.toISOString(),
          to_ts: to.toISOString(),
          min_duration_seconds: minDurationSeconds > 0 ? minDurationSeconds : undefined,
        };

        const [s, hbg, cal, al] = await Promise.all([
          reportsApi.getPersonSummary(person.id, common),
          reportsApi.getPersonHourByGateway(person.id, {
            ...common,
            // sempre janela de 24h para esse gráfico
            from_ts: new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            to_ts: to.toISOString(),
          }),
          reportsApi.getPersonCalendar(person.id, { ...common, granularity }),
          reportsApi.getPersonAlerts(person.id, { ...common, max_events: 500 }),
        ]);

        if (!mounted) return;
        setSummary(s);
        setHourByGateway(hbg);
        setCalendar(cal);
        setAlerts(al);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message ?? "Erro ao carregar relatórios da pessoa.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [person?.id, from, to, minDurationSeconds, granularity]);

  const topGateways = useMemo(() => {
    const list = (summary?.dwell_by_device ?? []).slice();
    list.sort((a, b) => (b.total_dwell_seconds ?? 0) - (a.total_dwell_seconds ?? 0));
    return list.slice(0, 8);
  }, [summary]);

  const dwellByGatewayBar = useMemo(
    () =>
      topGateways.map((d) => ({
        name: d.device_name ?? `Gateway #${d.device_id}`,
        dwell_min: Math.round((d.total_dwell_seconds ?? 0) / 60),
        sessions: d.sessions_count ?? 0,
      })),
    [topGateways]
  );

  const hourStack = useMemo(() => {
    const buckets = hourByGateway?.buckets ?? [];
    if (!buckets.length) return { data: [], keys: [] as string[], keyToName: {} as Record<string, string> };

    const totals: Record<string, number> = {};
    const names: Record<string, string> = {};

    for (const b of buckets) {
      const key = String(b.device_id ?? "unknown");
      totals[key] = (totals[key] ?? 0) + (b.total_dwell_seconds ?? 0);
      names[key] = b.device_name ?? `Gateway #${b.device_id}`;
    }

    const keys = Object.keys(totals)
      .sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))
      .slice(0, 6);

    const byHour: Record<number, any> = {};
    for (let h = 0; h < 24; h++) byHour[h] = { hour: h };

    for (const b of buckets) {
      const key = String(b.device_id ?? "unknown");
      if (!keys.includes(key)) continue;
      const h = b.hour ?? 0;
      const minutes = Math.round((b.total_dwell_seconds ?? 0) / 60);
      byHour[h][key] = (byHour[h][key] ?? 0) + minutes;
    }

    return { data: Object.values(byHour), keys, keyToName: names };
  }, [hourByGateway]);

  const calendarSeries = useMemo(() => {
    const buckets = calendar?.buckets ?? [];
    return buckets.map((b) => ({
      bucket_start: b.bucket_start,
      dwell_hours: Number(((b.total_dwell_seconds ?? 0) / 3600).toFixed(2)),
      sessions: b.sessions_count ?? 0,
    }));
  }, [calendar]);

  const alertsByType = useMemo(() => {
    const list = (alerts?.by_type ?? []).slice();
    list.sort((a, b) => (b.alerts_count ?? 0) - (alerts?.by_type?.find(y=>y.event_type===a.event_type)?.alerts_count ?? 0));
    return list.map((x) => ({ name: x.event_type ?? "UNKNOWN", count: x.alerts_count ?? 0 }));
  }, [alerts]);

  return (
    <div className="flex flex-col gap-4">
      <ReportCard
        title="Pessoa"
        subtitle="Selecione a pessoa para visualizar os relatórios."
        right={
          <div className="flex items-center gap-2">
            {loading ? <span className="text-[11px] text-slate-400">Carregando...</span> : null}
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={selectedPersonId ?? ""}
              onChange={(e) => onSelectPerson(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {error ? <div className="text-xs text-rose-400">{error}</div> : null}
        {!person ? (
          <div className="text-xs text-slate-500">Selecione uma pessoa para carregar os dados.</div>
        ) : (
          <div className="text-xs text-slate-400">
            Visualizando: <span className="font-semibold text-slate-200">{person.full_name}</span>
          </div>
        )}
      </ReportCard>

      <ReportCard
        title="Resumo"
        subtitle={person ? `Presença de ${person.full_name}` : "Selecione uma pessoa"}
      >
        {!person ? (
          <div className="text-xs text-slate-500">Selecione uma pessoa para visualizar relatórios.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Dwell total" value={formatSeconds(summary?.total_dwell_seconds ?? 0)} />
            <MiniStat label="Sessões" value={summary?.total_sessions ?? 0} />
            <MiniStat
              label="Primeira sessão"
              value={summary?.first_session_at ? new Date(summary.first_session_at).toLocaleString() : "-"}
            />
            <MiniStat
              label="Última sessão"
              value={summary?.last_session_at ? new Date(summary.last_session_at).toLocaleString() : "-"}
            />
          </div>
        )}
      </ReportCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard title="Tempo por gateway" subtitle="TOP gateways por dwell (no período).">
          {!person ? (
            <div className="text-xs text-slate-500">Selecione uma pessoa.</div>
          ) : dwellByGatewayBar.length === 0 ? (
            <div className="text-xs text-slate-500">Sem sessões no período.</div>
          ) : (
            <div className="min-w-0">
              <div className="h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={dwellByGatewayBar} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide tick={AXIS_TICK} />
                    <YAxis tick={AXIS_TICK} />
                    <Tooltip contentStyle={TOOLTIP_STYLE as any} />
                    <Legend />
                    <Bar dataKey="dwell_min" name="Minutos" fill={CHART_COLORS[0]} />
                    <Bar dataKey="sessions" name="Sessões" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">Mostrando até 8 gateways.</div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {topGateways.map((g) => (
                  <div
                    key={g.device_id}
                    className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-[11px] text-slate-300"
                  >
                    <div className="font-semibold text-slate-100">{g.device_name ?? `Gateway #${g.device_id}`}</div>
                    <div className="mt-1 text-slate-400">
                      Dwell: {formatSeconds(g.total_dwell_seconds)} · Sessões: {g.sessions_count}
                    </div>
                    {g.building_name ? <div className="text-slate-500">{g.building_name}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportCard>

        <ReportCard title="Últimas 24h por gateway" subtitle="Distribuição por hora do dia (stack).">
          {!person ? (
            <div className="text-xs text-slate-500">Selecione uma pessoa.</div>
          ) : hourStack.data.length === 0 ? (
            <div className="text-xs text-slate-500">Sem dados nas últimas 24h.</div>
          ) : (
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={hourStack.data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE as any} />
                  <Legend />
                  {hourStack.keys.map((k, idx) => (
                    <Bar
                      key={k}
                      stackId="a"
                      dataKey={k}
                      name={hourStack.keyToName[k] ?? k}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-2 text-[11px] text-slate-400">
                Stack mostra <span className="font-semibold">minutos</span> por hora (TOP 6 gateways).
              </div>
            </div>
          )}
        </ReportCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportCard
          title="Dwell no calendário"
          subtitle="Evolução por bucket (dia/semana/mês/ano)."
          right={
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              disabled={!person}
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          }
        >
          {!person ? (
            <div className="text-xs text-slate-500">Selecione uma pessoa.</div>
          ) : calendarSeries.length === 0 ? (
            <div className="text-xs text-slate-500">Sem dados para o período.</div>
          ) : (
            <div className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={calendarSeries} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket_start" hide tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE as any} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="dwell_hours"
                    name="Horas"
                    dot={false}
                    stroke={CHART_COLORS[1]}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>

        <ReportCard title="Alertas" subtitle="Contagem por tipo (no período).">
          {!person ? (
            <div className="text-xs text-slate-500">Selecione uma pessoa.</div>
          ) : alertsByType.length === 0 ? (
            <div className="text-xs text-slate-500">Sem alertas no período.</div>
          ) : (
            <div className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={alertsByType} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TOOLTIP_STYLE as any} />
                  <Bar dataKey="count" name="Alertas" fill={CHART_COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-2 text-[11px] text-slate-400">
                Total: <span className="font-semibold">{alerts?.total_alerts ?? 0}</span>
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

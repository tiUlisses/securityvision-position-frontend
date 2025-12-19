// src/features/reports/components/ReportFiltersBar.tsx
import { useMemo } from "react";
import { clampHoursWindow, parseDateInput, toDateInputValue } from "../utils";

export type ReportFilters = {
  from: Date;
  to: Date;
  minDurationSeconds: number;
};

type Props = {
  value: ReportFilters;
  onChange: (next: ReportFilters) => void;
};

function setToEndOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function setToStartOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export default function ReportFiltersBar({ value, onChange }: Props) {
  const fromStr = useMemo(() => toDateInputValue(value.from), [value.from]);
  const toStr = useMemo(() => toDateInputValue(value.to), [value.to]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-300">
              De
            </label>
            <input
              type="date"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={fromStr}
              onChange={(e) => {
                const dt = parseDateInput(e.target.value);
                if (!dt) return;
                const nextFrom = setToStartOfDay(dt);
                onChange({ ...value, from: nextFrom });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-300">
              Até
            </label>
            <input
              type="date"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={toStr}
              onChange={(e) => {
                const dt = parseDateInput(e.target.value);
                if (!dt) return;
                const nextTo = setToEndOfDay(dt);
                onChange({ ...value, to: nextTo });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-300">
              Duração mín. (s)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={value.minDurationSeconds}
              onChange={(e) =>
                onChange({
                  ...value,
                  minDurationSeconds: Math.max(0, Number(e.target.value || 0)),
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const { from, to } = clampHoursWindow(24);
              onChange({ ...value, from, to });
            }}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
          >
            Últimas 24h
          </button>
          <button
            type="button"
            onClick={() => {
              const { from, to } = clampHoursWindow(24 * 7);
              onChange({ ...value, from, to });
            }}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
          >
            7 dias
          </button>
          <button
            type="button"
            onClick={() => {
              const { from, to } = clampHoursWindow(24 * 30);
              onChange({ ...value, from, to });
            }}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
          >
            30 dias
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-400">
        Enviando <span className="font-mono">from_ts</span> e <span className="font-mono">to_ts</span> sempre (essas rotas exigem janela fechada para buckets por hora).
      </div>
    </div>
  );
}

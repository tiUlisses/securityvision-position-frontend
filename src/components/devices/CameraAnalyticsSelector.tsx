// src/components/devices/CameraAnalyticsSelector.tsx
import { useMemo, useState } from "react";
import {
  ANALYTICS_BY_MANUFACTURER,
  DEFAULT_ANALYTICS_BY_MANUFACTURER,
} from "../../constants/analytics";

type CameraAnalyticsSelectorProps = {
  manufacturer?: string | null;
  value: string[]; // lista de analíticos selecionados
  onChange: (analytics: string[]) => void;
};

export function CameraAnalyticsSelector({
  manufacturer,
      value,
      onChange,
}: CameraAnalyticsSelectorProps) {
  const [search, setSearch] = useState("");

  const manufacturerKey = (manufacturer || "").toLowerCase();

  const allOptions: string[] = useMemo(() => {
    return ANALYTICS_BY_MANUFACTURER[manufacturerKey] ?? [];
  }, [manufacturerKey]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return allOptions;
    const term = search.toLowerCase();
    return allOptions.filter((a) => a.toLowerCase().includes(term));
  }, [allOptions, search]);

  const handleToggle = (analytic: string) => {
    if (value.includes(analytic)) {
      onChange(value.filter((x) => x !== analytic));
    } else {
      onChange([...value, analytic]);
    }
  };

  const handleSelectAll = () => {
    onChange([...allOptions]);
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleApplyDefault = () => {
    const defaults = DEFAULT_ANALYTICS_BY_MANUFACTURER[manufacturerKey] ?? [];
    onChange(defaults);
  };

  if (!manufacturer) {
    return (
      <div className="border border-slate-700 rounded-md p-3 text-xs text-slate-400">
        Selecione primeiro o <strong>Fabricante</strong> para escolher os
        analíticos disponíveis.
      </div>
    );
  }

  if (!allOptions.length) {
    return (
      <div className="border border-amber-500/40 bg-amber-500/10 text-amber-100 text-xs rounded-md p-3">
        Nenhuma lista de analíticos cadastrada para o fabricante{" "}
        <strong>{manufacturer}</strong>.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-xs font-medium text-slate-200">
          Analíticos ({value.length}/{allOptions.length})
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Filtrar analíticos..."
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 w-full sm:w-48"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={handleApplyDefault}
            className="text-[11px] px-2 py-1 rounded bg-sv-accent text-white hover:bg-sv-accentSoft"
          >
            Sugestão padrão
          </button>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            Selecionar todos
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="border border-slate-800 rounded-md max-h-48 overflow-y-auto bg-slate-950">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-500">
            Nenhum analítico encontrado para o filtro atual.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {filteredOptions.map((analytic) => {
              const checked = value.includes(analytic);
              return (
                <li
                  key={analytic}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-100"
                >
                  <label className="inline-flex items-center gap-2 w-full cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-600 bg-slate-900"
                      checked={checked}
                      onChange={() => handleToggle(analytic)}
                    />
                    <span className="truncate">{analytic}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Os analíticos selecionados serão enviados no campo{" "}
        <code className="bg-slate-900 px-1 rounded">analytics[]</code> do
        payload, para o cam-bus saber exatamente quais eventos assinar.
      </p>
    </div>
  );
}

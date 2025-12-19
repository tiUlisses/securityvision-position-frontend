// src/pages/ReportsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import type { Building, Device, Person } from "../api/types";

import ReportFiltersBar, {
  type ReportFilters,
} from "../features/reports/components/ReportFiltersBar";
import BuildingPanel from "../features/reports/panels/BuildingPanel";
import GatewayPanel from "../features/reports/panels/GatewayPanel";
import OverviewPanel from "../features/reports/panels/OverviewPanel";
import PersonPanel from "../features/reports/panels/PersonPanel";

type TabKey = "overview" | "person" | "gateway" | "building";

function tabButtonClass(active: boolean): string {
  return [
    "rounded-md px-3 py-1.5 text-xs font-medium border",
    active
      ? "bg-sv-accent text-white border-sv-accent"
      : "bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800",
  ].join(" ");
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("overview");

  const [people, setPeople] = useState<Person[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [loadingRef, setLoadingRef] = useState(true);
  const [refError, setRefError] = useState<string | null>(null);

  // Janela padrão: últimos 7 dias
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from, to, minDurationSeconds: 30 };
  });

  const gateways = useMemo(
    () => devices.filter((d) => d.type === "BLE_GATEWAY"),
    [devices]
  );

  // Seleções por aba
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedGatewayId, setSelectedGatewayId] = useState<number | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);

  useEffect(() => {
    const loadRef = async () => {
      try {
        setLoadingRef(true);
        setRefError(null);

        const [peopleData, devicesData, buildingsData] = await Promise.all([
          apiGet<Person[]>("/people/"),
          apiGet<Device[]>("/devices/"),
          apiGet<Building[]>("/buildings/"),
        ]);

        setPeople(peopleData);
        setDevices(devicesData);
        setBuildings(buildingsData);

        // defaults de seleção
        if (peopleData.length > 0) setSelectedPersonId((prev) => prev ?? peopleData[0].id);
        const gw = devicesData.filter((d) => d.type === "BLE_GATEWAY");
        if (gw.length > 0) setSelectedGatewayId((prev) => prev ?? gw[0].id);
        if (buildingsData.length > 0) setSelectedBuildingId((prev) => prev ?? buildingsData[0].id);
      } catch (err) {
        console.error(err);
        setRefError((err as Error)?.message ?? "Erro ao carregar dados de referência (pessoas/devices/prédios)." );
      } finally {
        setLoadingRef(false);
      }
    };

    void loadRef();
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Relatórios RTLS</h1>
          <p className="text-sm text-slate-400">
            Use as abas para ver métricas por pessoa, gateway e prédio. Todos os gráficos usam as novas rotas de <code>/reports</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={tabButtonClass(tab === "overview")} onClick={() => setTab("overview")}>Overview</button>
          <button className={tabButtonClass(tab === "person")} onClick={() => setTab("person")}>Pessoa</button>
          <button className={tabButtonClass(tab === "gateway")} onClick={() => setTab("gateway")}>Gateway</button>
          <button className={tabButtonClass(tab === "building")} onClick={() => setTab("building")}>Prédio</button>
        </div>
      </header>

      <ReportFiltersBar value={filters} onChange={setFilters} />

      {refError && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-3 text-xs text-rose-200">
          {refError}
        </div>
      )}

      {loadingRef && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
          Carregando dados de referência...
        </div>
      )}

      {!loadingRef && tab === "overview" && (
        <OverviewPanel from={filters.from} to={filters.to} deviceId={selectedGatewayId ?? undefined} />
      )}

      {!loadingRef && tab === "person" && (
        <PersonPanel
          people={people}
          selectedPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
          from={filters.from}
          to={filters.to}
          minDurationSeconds={filters.minDurationSeconds}
        />
      )}

      {!loadingRef && tab === "gateway" && (
        <GatewayPanel
          gateways={gateways}
          selectedGatewayId={selectedGatewayId}
          onSelectGateway={setSelectedGatewayId}
          from={filters.from}
          to={filters.to}
          minDurationSeconds={filters.minDurationSeconds}
        />
      )}

      {!loadingRef && tab === "building" && (
        <BuildingPanel
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          onSelectBuilding={setSelectedBuildingId}
          from={filters.from}
          to={filters.to}
          minDurationSeconds={filters.minDurationSeconds}
        />
      )}
    </div>
  );
}

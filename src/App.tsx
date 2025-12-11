// src/App.tsx
import { useState } from "react";
import AppLayout from "./components/layout/AppLayout";

import BuildingsAndFloorsPage from "./pages/BuildingsAndFloorsPage";
import PeopleAndTagsPage from "./pages/PeopleAndTagsPage";
import GatewaysPage from "./pages/GatewaysPage";
import DashboardPage from "./pages/DashboardPage";
import AlertRulesPage from "./pages/AlertRulesPage";
import WebhooksPage from "./pages/WebhooksPage";
import DevicesPage from "./pages/DevicesPage";
import IncidentsPage from "./pages/IncidentsPage";
import ReportsPage from "./pages/ReportsPage";
import IncidentRulesPage from "./pages/IncidentRulesPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./contexts/AuthContext";

type PageKey =
  "incidents-rules"
  | "dashboard"
  | "incidents"
  | "devices"
  | "alerts"
  | "buildings"
  | "gateways"
  | "people"
  | "reports"
  | "webhooks";

type NavItem = {
  key: string;
  label: string;
  onClick: () => void;
  active?: boolean;
};

function App() {
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState<PageKey>("dashboard");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 text-sm">
        Carregando sessão...
      </div>
    );
  }

  // 🔐 Se não tiver usuário logado, mostra só a tela de Auth
  if (!user) {
    return <AuthPage />;
  }

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      onClick: () => setPage("dashboard"),
      active: page === "dashboard",
    },
    {
      key: "alerts",
      label: "Alertas",
      onClick: () => setPage("alerts"),
      active: page === "alerts",
    },
    {
      key: "incidents-rules",
      label: "Regras de Incidentes",
      onClick: () => setPage("incidents-rules"),
      active: page === "incidents-rules",
    },
    {
      key: "reports",
      label: "Relatórios",
      onClick: () => setPage("reports"),
      active: page === "reports",
    },
    {
      key: "buildings",
      label: "Prédios & Plantas",
      onClick: () => setPage("buildings"),
      active: page === "buildings",
    },
    {
      key: "gateways",
      label: "Gateways",
      onClick: () => setPage("gateways"),
      active: page === "gateways",
    },
    {
      key: "devices",
      label: "Dispositivos",
      onClick: () => setPage("devices"),
      active: page === "devices",
    },
    {
      key: "people",
      label: "Pessoas & Tags",
      onClick: () => setPage("people"),
      active: page === "people",
    },
    {
      key: "webhooks",
      label: "Webhooks & Integrações",
      onClick: () => setPage("webhooks"),
      active: page === "webhooks",
    },
    {
      key: "incidents",
      label: "Incidentes",
      onClick: () => setPage("incidents"),
      active: page === "incidents",
    },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "alerts":
        return <AlertRulesPage />;
      case "reports":
        return <ReportsPage />;
      case "buildings":
        return <BuildingsAndFloorsPage />;
      case "gateways":
        return <GatewaysPage />;
      case "devices":
        return <DevicesPage />;
      case "people":
        return <PeopleAndTagsPage />;
      case "webhooks":
        return <WebhooksPage />;
      case "incidents":
        return <IncidentsPage />;
      case "incidents-rules":
        return <IncidentRulesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <AppLayout navItems={navItems}>{renderPage()}</AppLayout>;
}

export default App;

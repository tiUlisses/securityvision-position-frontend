// src/App.tsx
import { useState, useEffect } from "react";
import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import BuildingsAndFloorsPage from "./pages/BuildingsAndFloorsPage";
import PeopleAndTagsPage from "./pages/PeopleAndTagsPage";
import GatewaysPage from "./pages/GatewaysPage";
import AlertRulesPage from "./pages/AlertRulesPage";
import WebhooksPage from "./pages/WebhooksPage";
import DevicesPage from "./pages/DevicesPage";
import IncidentsPage from "./pages/IncidentsPage";
import ReportsPage from "./pages/ReportsPage";  // 🔹 nova página

import AuthPage from "./pages/AuthPage";  // Tela de login/signup
import { useAuth } from "./contexts/AuthContext";

type PageKey =
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

  // Carregamento da tela de login ou a tela principal do app
  useEffect(() => {
    if (!isLoading && !user) {
      setPage("auth");  // Se não estiver logado, vamos para a página de login
    }
  }, [isLoading, user]);

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", onClick: () => setPage("dashboard") },
    { key: "alerts", label: "Alertas", onClick: () => setPage("alerts") },
    { key: "reports", label: "Relatórios", onClick: () => setPage("reports") },
    { key: "buildings", label: "Prédios & Plantas", onClick: () => setPage("buildings") },
    { key: "gateways", label: "Gateways", onClick: () => setPage("gateways") },
    { key: "devices", label: "Dispositivos", onClick: () => setPage("devices") },
    { key: "people", label: "Pessoas & Tags", onClick: () => setPage("people") },
    { key: "webhooks", label: "Webhooks & Integrações", onClick: () => setPage("webhooks") },
    { key: "incidents", label: "Incidentes", onClick: () => setPage("incidents") },
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
      case "auth":
        return <AuthPage />;  // Página de login/signup
      default:
        return <DashboardPage />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100 text-sm">
        Carregando contexto de sessão…
      </div>
    );
  }

  return (
    <AppLayout navItems={navItems}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;

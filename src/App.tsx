// src/App.tsx
import React, { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import type { NavItem } from "./components/layout/AppLayout";
import RequireAuth from "./components/auth/RequireAuth";

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
import NotFoundPage from "./pages/NotFoundPage";

import AdminUsersGroupsPage from "./pages/AdminUsersGroupsPage";

import { useAuth } from "./contexts/AuthContext";

const App: React.FC = () => {
  const { user } = useAuth();
  const isAdmin =
    !!user && (user.is_superuser || ["ADMIN", "SUPERADMIN"].includes(user.role));

  const navItems: NavItem[] = useMemo(() => {
    const base: NavItem[] = [
      { key: "dashboard", label: "Dashboard", to: "/", end: true },
      { key: "alerts", label: "Alertas", to: "/alerts" },
      { key: "incidents-rules", label: "Regras de Incidentes", to: "/incident-rules" },
      { key: "reports", label: "Relatórios", to: "/reports" },
      { key: "buildings", label: "Prédios & Plantas", to: "/buildings" },
      { key: "gateways", label: "Gateways", to: "/gateways" },
      { key: "devices", label: "Dispositivos", to: "/devices" },
      { key: "people", label: "Pessoas & Tags", to: "/people" },
      { key: "webhooks", label: "Webhooks & Integrações", to: "/webhooks" },
      { key: "incidents", label: "Incidentes", to: "/incidents" },
    ];

    if (isAdmin) {
      base.splice(1, 0, {
        key: "admin-users",
        label: "Usuários & Grupos",
        to: "/admin/users-groups",
      });
    }

    return base;
  }, [isAdmin]);

  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />

      {/* App protegido */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout navItems={navItems} />}>
          <Route index element={<DashboardPage />} />
          <Route path="alerts" element={<AlertRulesPage />} />
          <Route path="incident-rules" element={<IncidentRulesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="buildings" element={<BuildingsAndFloorsPage />} />
          <Route path="gateways" element={<GatewaysPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="people" element={<PeopleAndTagsPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="incidents" element={<IncidentsPage />} />

          {/* Admin */}
          <Route
            path="admin/users-groups"
            element={
              isAdmin ? <AdminUsersGroupsPage /> : <Navigate to="/" replace />
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* fallback global */}
      <Route path="*" element={<Navigate to={user ? "/" : "/auth"} replace />} />
    </Routes>
  );
};

export default App;

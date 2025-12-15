// src/components/layout/AppLayout.tsx
import React, { useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export type NavItem = {
  key: string;
  label: string;
  to: string;
  end?: boolean;
};

interface AppLayoutProps {
  navItems: NavItem[];
}

const AppLayout: React.FC<AppLayoutProps> = ({ navItems }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPageLabel = useMemo(() => {
    const path = location.pathname;

    // match exato pra "/"
    const root = navItems.find((i) => i.to === "/" && path === "/");
    if (root) return root.label;

    // match por prefixo
    const byPrefix = navItems
      .filter((i) => i.to !== "/")
      .find((i) => path.startsWith(i.to));

    return byPrefix?.label ?? "SecurityVision Position";
  }, [location.pathname, navItems]);

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="app-root">
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-xs uppercase tracking-[0.2em] text-sv-accent">
            SecurityVision
          </div>
          <div className="text-lg font-semibold text-slate-50">Position</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block w-full text-left px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-sv-accent text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          v0.1 • MVP RTLS
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="app-content">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-50 truncate">
              {currentPageLabel}
            </h1>
            <span className="text-xs text-slate-400">
              BLE Gateways • Pessoas • Plantas • Incidentes
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right min-w-0">
              <span className="text-xs font-semibold text-slate-100 truncate max-w-[220px]">
                {user?.full_name || user?.email || "Usuário"}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
                {user?.email}
              </span>
            </div>

            <span className="hidden md:inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
              {user?.role || "—"}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

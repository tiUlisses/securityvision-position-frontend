// src/components/layout/AppLayout.tsx
import React from "react";

export interface NavItem {
  key: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface AppLayoutProps {
  navItems: NavItem[];
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ navItems, children }) => {
  return (
    <div className="app-root">
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-xs uppercase tracking-[0.2em] text-sv-accent">
            SecurityVision
          </div>
          <div className="text-lg font-semibold text-slate-50">
            Position
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition 
                ${
                  item.active
                    ? "bg-sv-accent text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          v0.1 • MVP RTLS
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="app-content">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-50">
            SecurityVision Position
          </h1>
          <span className="text-xs text-slate-400">
            BLE Gateways • Pessoas • Plantas
          </span>
        </div>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;

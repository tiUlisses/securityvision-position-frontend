// src/components/layout/Sidebar.tsx
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/buildings", label: "Prédios" },
  { to: "/floors", label: "Andares" },
  { to: "/floor-plans", label: "Plantas" },
  { to: "/people", label: "Pessoas" },
  { to: "/tags", label: "Tags" },
  { to: "/gateways", label: "Gateways" },
  { to: "/alert-rules", label: "Alertas" },
  { to: "/tracking", label: "Rastreamento" },
];

export default function Sidebar() {
  return (
    <aside className="app-sidebar" data-testid="app-sidebar">
      <div className="app-sidebar-title">Menu</div>
      <nav className="app-sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive
                ? "app-sidebar-link app-sidebar-link-active"
                : "app-sidebar-link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

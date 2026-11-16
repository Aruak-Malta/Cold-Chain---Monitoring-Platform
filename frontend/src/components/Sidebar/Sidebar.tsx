import { NavLink } from "react-router-dom";
import coldGhostMark from "../../assets/cold-ghost-mark.jpeg";
import { navigationItems } from "../../data/navigation";
import type { AccountDashboard } from "../../services/supabase";
import { Icon } from "../Icon/Icon";

type SidebarProps = {
  mobileOpen: boolean;
  close: () => void;
  pendingAlertCount: number;
  basePath: string;
  accountDashboard: AccountDashboard | null;
};

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Sidebar({
  mobileOpen,
  close,
  pendingAlertCount,
  basePath,
  accountDashboard,
}: Readonly<SidebarProps>) {
  const firstCompany = accountDashboard?.companies[0];
  const companyName = firstCompany?.nome ?? "Supermercado Central";
  const userName = accountDashboard?.name ?? "Marina Rocha";
  const userDescription = accountDashboard?.email ?? "Administradora";

  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} type="button" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><img src={coldGhostMark} alt="" /></span>
          <span>Cold <span>Ghost</span></span>
        </div>
        <div className="store-switcher">
          <span className="store-avatar">{initials(companyName)}</span>
          <span><small>{accountDashboard ? "Sua empresa" : "Estabelecimento"}</small><strong>{companyName}</strong></span>
          <Icon name="chevron" size="sm" />
        </div>
        <nav className="nav-list">
          <span className="nav-label">MONITORAMENTO</span>
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path.replace("/demo", basePath)}
              end={item.path === "/demo"}
              onClick={close}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.path === "/demo/alertas" && pendingAlertCount > 0 && <b>{pendingAlertCount}</b>}
            </NavLink>
          ))}
          <span className="nav-label second">SISTEMA</span>
          <NavLink
            to={`${basePath}/configuracoes`}
            onClick={close}
            className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
          >
            <Icon name="settings" /><span>Configurações</span>
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="system-status">
            <span className="pulse" />
            <span><strong>Sistema operacional</strong><small>Última sincronização agora</small></span>
          </div>
          <div className="user-row">
            <span className="avatar">{initials(userName)}</span>
            <span><strong>{userName}</strong><small>{userDescription}</small></span>
            <Icon name="more" />
          </div>
        </div>
      </aside>
    </>
  );
}

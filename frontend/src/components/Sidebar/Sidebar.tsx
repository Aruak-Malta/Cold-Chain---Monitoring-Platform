import { NavLink } from "react-router-dom";
import { navigationItems } from "../../data/navigation";
import { Icon } from "../Icon/Icon";

type SidebarProps = {
  mobileOpen: boolean;
  close: () => void;
  pendingAlertCount: number;
};

export function Sidebar({ mobileOpen, close, pendingAlertCount }: Readonly<SidebarProps>) {
  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} type="button" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="snow" /></span>
          <span>Frio<span>Sentinela</span></span>
        </div>
        <div className="store-switcher">
          <span className="store-avatar">SC</span>
          <span><small>Estabelecimento</small><strong>Supermercado Central</strong></span>
          <Icon name="chevron" size="sm" />
        </div>
        <nav className="nav-list">
          <span className="nav-label">MONITORAMENTO</span>
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={close}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.path === "/alertas" && pendingAlertCount > 0 && <b>{pendingAlertCount}</b>}
            </NavLink>
          ))}
          <span className="nav-label second">SISTEMA</span>
          <NavLink
            to="/configuracoes"
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
            <span className="avatar">MR</span>
            <span><strong>Marina Rocha</strong><small>Administradora</small></span>
            <Icon name="more" />
          </div>
        </div>
      </aside>
    </>
  );
}

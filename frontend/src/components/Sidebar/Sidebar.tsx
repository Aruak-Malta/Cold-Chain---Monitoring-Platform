import { useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import coldGhostMark from "../../assets/cold-ghost-mark.jpeg";
import { navigationItems } from "../../data/navigation";
import type { AccountCompany, AccountDashboard } from "../../services/supabase";
import { Icon } from "../Icon/Icon";

type SidebarProps = {
  mobileOpen: boolean;
  close: () => void;
  pendingAlertCount: number;
  basePath: string;
  accountDashboard: AccountDashboard | null;
  selectedCompany: AccountCompany | null;
  onSelectCompany: (companyId: string | number) => void;
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

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 14
    ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    : value;
}

export function Sidebar({
  mobileOpen,
  close,
  pendingAlertCount,
  basePath,
  accountDashboard,
  selectedCompany,
  onSelectCompany,
}: Readonly<SidebarProps>) {
  const navigate = useNavigate();
  const companySelectorRef = useRef<HTMLDetailsElement>(null);
  const companyName = selectedCompany?.nome ?? "Supermercado Central";
  const userName = accountDashboard?.name ?? "Marina Rocha";
  const userDescription = accountDashboard?.email ?? "Administradora";

  function chooseCompany(companyId: string | number) {
    onSelectCompany(companyId);
    if (companySelectorRef.current) {
      companySelectorRef.current.open = false;
    }
  }

  return (
    <>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} type="button" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><img src={coldGhostMark} alt="" /></span>
          <span>Cold <span>Ghost</span></span>
        </div>
        {accountDashboard && accountDashboard.companies.length > 1 ? (
          <details className="company-selector" ref={companySelectorRef}>
            <summary className="store-switcher">
              <span className="store-avatar">{initials(companyName)}</span>
              <span><small>Sua empresa</small><strong>{companyName}</strong></span>
              <span className="company-chevron-down"><Icon name="chevron" size="sm" /></span>
            </summary>
            <div className="company-menu">
              {accountDashboard.companies.map((company) => {
                const isSelected = String(company.id_company) === String(selectedCompany?.id_company);
                return (
                  <button
                    className={`company-option${isSelected ? " company-option-selected" : ""}`}
                    key={company.id_company}
                    onClick={() => chooseCompany(company.id_company)}
                    type="button"
                  >
                    <span className="company-option-avatar">{initials(company.nome)}</span>
                    <span>
                      <strong>{company.nome}</strong>
                      <small>CNPJ {formatCnpj(company.cnpj)}</small>
                    </span>
                    {isSelected && <Icon name="check" size="sm" />}
                  </button>
                );
              })}
              <button
                className="company-add-action"
                onClick={() => navigate("/empresas?adicionar=1")}
                type="button"
              >
                <Icon name="plus" size="sm" />
                Adicionar empresa
              </button>
            </div>
          </details>
        ) : accountDashboard ? (
          <div className="store-switcher">
            <span className="store-avatar">{initials(companyName)}</span>
            <span><small>Sua empresa</small><strong>{companyName}</strong></span>
            <button
              aria-label="Adicionar empresa"
              className="company-add-single"
              onClick={() => navigate("/empresas?adicionar=1")}
              title="Adicionar empresa"
              type="button"
            >
              <Icon name="plus" size="sm" />
            </button>
          </div>
        ) : (
          <div className="store-switcher">
            <span className="store-avatar">{initials(companyName)}</span>
            <span><small>Estabelecimento</small><strong>{companyName}</strong></span>
            <Icon name="chevron" size="sm" />
          </div>
        )}
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

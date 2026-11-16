import { useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { EquipmentCard } from "../../components/EquipmentCard/EquipmentCard";
import { Icon } from "../../components/Icon/Icon";
import { equipment } from "../../data/equipment";
import { getSessionAlerts } from "../../services/sessionAlertService";
import { toEquipment } from "../../services/sessionEquipmentService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import type { Alert } from "../../types/Alert";
import type { IconName } from "../../types/Icon";

type SummaryCardProps = {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
  tone: string;
};

function SummaryCard({ icon, label, value, detail, tone }: Readonly<SummaryCardProps>) {
  return (
    <div className="summary-card">
      <span className={`summary-icon ${tone}`}><Icon name={icon} /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </div>
  );
}

export function Overview() {
  const navigate = useNavigate();
  const {
    search,
    mode,
    basePath,
    accountDashboard,
    selectedCompany,
    selectCompany,
    sessionEquipments,
    equipmentLoadError,
    dashboardSummary,
    dashboardSummaryError,
    acknowledgedAlertIds,
    acknowledgeAlerts,
    openEquipment,
    openAddEquipment,
    notify,
  } = useOutletContext<AppOutletContext>();
  const [filter, setFilter] = useState("Todos");
  const uploadedEquipment = sessionEquipments.map((item, index) => toEquipment(item, index));
  const displayedEquipment = uploadedEquipment.length
    ? uploadedEquipment
    : mode === "demo"
      ? equipment.slice(0, 1)
      : [];
  const pendingAlerts = getSessionAlerts(sessionEquipments)
    .filter((alert) => !acknowledgedAlertIds.includes(alert.id))
    .sort((left, right) => Number(right.level === "critical") - Number(left.level === "critical"));
  const prominentAlert = pendingAlerts[0];
  const alertEquipmentIndex = prominentAlert
    ? sessionEquipments.findIndex((item) => item.serial === prominentAlert.equipmentSerial)
    : -1;

  const filteredEquipment = useMemo(() => displayedEquipment.filter((item) => {
    const statusMatches =
      filter === "Todos" ||
      (filter === "Em alerta" && ["critical", "warning"].includes(item.status));
    return statusMatches && `${item.name} ${item.place}`.toLowerCase().includes(search.toLowerCase());
  }), [displayedEquipment, filter, search]);

  const formatAverageTemperature = (value: number | null | undefined) =>
    value === null || value === undefined
      ? "—"
      : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} °C`;
  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 14
      ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
      : value;
  };
  const firstName = accountDashboard?.name.trim().split(/\s+/)[0];
  const companySelectorRef = useRef<HTMLDetailsElement>(null);

  return (
    <>
      <section className="welcome-row">
        <div>
          <p>VISÃO GERAL</p>
          <h1>{mode === "account" ? `Olá, ${firstName || "bem-vindo"}.` : "Bom dia."}</h1>
          <span>
            {mode === "account"
              ? "Confira os dados das empresas vinculadas à sua conta."
              : "Acompanhe os dados analisados dos seus equipamentos."}
          </span>
        </div>
        <Button variant="primary" onClick={openAddEquipment}><Icon name="plus" />Novo equipamento</Button>
      </section>
      {mode === "account" && accountDashboard && (
        <>
          <section className="section-header account-companies-heading">
            <div><h2>Empresa</h2><span>{accountDashboard.companies.length > 1 ? "Selecione a empresa que deseja acessar" : "Empresa vinculada à sua conta"}</span></div>
          </section>
          <section className="account-company-grid">
            {selectedCompany && (
              accountDashboard.companies.length > 1 ? (
                <details className="account-home-company-selector" ref={companySelectorRef}>
                  <summary className="summary-card account-company-card">
                    <span className="summary-icon blue"><Icon name="grid" /></span>
                    <div>
                      <span>Empresa</span>
                      <strong>{selectedCompany.nome}</strong>
                      <small>CNPJ {formatCnpj(selectedCompany.cnpj)}</small>
                    </div>
                    <span className="company-chevron-down"><Icon name="chevron" size="sm" /></span>
                  </summary>
                  <div className="account-home-company-menu">
                    {accountDashboard.companies.map((company) => (
                      <button
                        className="account-home-company-option"
                        key={company.id_company}
                        onClick={() => {
                          selectCompany(company.id_company);
                          if (companySelectorRef.current) companySelectorRef.current.open = false;
                        }}
                        type="button"
                      >
                        <span>
                          <strong>{company.nome}</strong>
                          <small>CNPJ {formatCnpj(company.cnpj)}</small>
                        </span>
                        {String(company.id_company) === String(selectedCompany.id_company) && (
                          <Icon name="check" size="sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </details>
              ) : (
                <article className="summary-card account-company-card">
                  <span className="summary-icon blue"><Icon name="grid" /></span>
                  <div>
                    <span>Empresa</span>
                    <strong>{selectedCompany.nome}</strong>
                    <small>CNPJ {formatCnpj(selectedCompany.cnpj)}</small>
                  </div>
                </article>
              )
            )}
          </section>
        </>
      )}
      <section className="summary-grid">
        <SummaryCard
          icon="snow"
          label="Equipamentos enviados"
          value={dashboardSummary ? String(dashboardSummary.total_equipamentos) : "—"}
          detail="Cadastrados nesta sessão"
          tone="blue"
        />
        <SummaryCard
          icon="chart"
          label="Análises concluídas"
          value={dashboardSummary ? dashboardSummary.analises_concluidas.toLocaleString("pt-BR") : "—"}
          detail="Processadas pelo backend"
          tone="amber"
        />
        <SummaryCard
          icon="bell"
          label="Equipamentos em atenção"
          value={dashboardSummary ? String(dashboardSummary.alertas) : "—"}
          detail="Status geral dos laudos disponíveis"
          tone="red"
        />
        <SummaryCard
          icon="thermometer"
          label="Temperatura média"
          value={formatAverageTemperature(dashboardSummary?.temperatura_media)}
          detail="Média das leituras da sessão"
          tone="green"
        />
      </section>
      {dashboardSummaryError && (
        <div className="empty-state" role="alert">{dashboardSummaryError}</div>
      )}
      {equipmentLoadError && (
        <div className="empty-state" role="alert">{equipmentLoadError}</div>
      )}
      {prominentAlert && !equipmentLoadError && (
        <OverviewAlert
          alert={prominentAlert}
          onViewEquipment={() => {
            const item = sessionEquipments[alertEquipmentIndex];
            if (item) openEquipment(toEquipment(item, alertEquipmentIndex));
          }}
          onAcknowledge={() => {
            const saved = acknowledgeAlerts([prominentAlert.id]);
            notify(saved
              ? "Aviso reconhecido nesta sessão."
              : "Aviso reconhecido apenas até a página ser recarregada; o navegador não permitiu salvar a sessão.");
          }}
        />
      )}
      <section className="section-header">
        <div><h2>Equipamentos</h2><span>{uploadedEquipment.length ? "Dispositivos enviados nesta sessão" : mode === "demo" ? "Exemplo exibido até você enviar seu primeiro dispositivo" : "Nenhum dispositivo adicionado nesta sessão"}</span></div>
        <div className="equipment-tools">
          <div className="filter-tabs">
            {["Todos", "Em alerta"].map((item) => (
              <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <Button onClick={() => navigate(`${basePath}/equipamentos`)}>Ver todos <Icon name="arrow" size="sm" /></Button>
        </div>
      </section>
      <section className="equipment-grid">
        {filteredEquipment.map((item) => (
          <EquipmentCard key={item.id} equipment={item} onOpen={() => openEquipment(item)} />
        ))}
        {!filteredEquipment.length && (
          <div className="empty-state">
            <Icon name="search" size="lg" />
            <strong>Nenhum equipamento encontrado</strong>
            <span>Envie um equipamento ou ajuste a busca e os filtros.</span>
          </div>
        )}
      </section>
    </>
  );
}

type OverviewAlertProps = {
  alert: Alert;
  onViewEquipment: () => void;
  onAcknowledge: () => void;
};

function OverviewAlert({ alert, onViewEquipment, onAcknowledge }: Readonly<OverviewAlertProps>) {
  const isCritical = alert.level === "critical";
  return (
    <section className="critical-alert" aria-label="Aviso pendente">
      <span className="alert-symbol"><Icon name={alert.icon} /></span>
      <div className="alert-copy">
        <div>
          <span>{isCritical ? "ALERTA CRÍTICO" : "AVISO"}</span>
          <small>{alert.time}</small>
        </div>
        <strong>{alert.title} em {alert.equipmentName}</strong>
        <p>{alert.detail} · {alert.value}</p>
      </div>
      <div className="alert-actions">
        <Button onClick={onViewEquipment}>Ver equipamento</Button>
        <Button variant="primary" onClick={onAcknowledge}>
          <Icon name="check" />Reconhecer alerta
        </Button>
      </div>
    </section>
  );
}

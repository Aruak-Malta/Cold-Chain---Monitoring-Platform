import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { EquipmentCard } from "../../components/EquipmentCard/EquipmentCard";
import { Icon } from "../../components/Icon/Icon";
import { equipment } from "../../data/equipment";
import { toEquipment } from "../../services/sessionEquipmentService";
import type { AppOutletContext } from "../../types/AppOutletContext";
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
    sessionEquipments,
    equipmentLoadError,
    dashboardSummary,
    dashboardSummaryError,
    openEquipment,
    openAddEquipment,
  } = useOutletContext<AppOutletContext>();
  const [filter, setFilter] = useState("Todos");
  const uploadedEquipment = sessionEquipments.map((item, index) => toEquipment(item, index));
  const displayedEquipment = uploadedEquipment.length ? uploadedEquipment : equipment.slice(0, 1);

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

  return (
    <>
      <section className="welcome-row">
        <div><p>VISÃO GERAL</p><h1>Bom dia.</h1><span>Acompanhe os dados analisados dos seus equipamentos.</span></div>
        <Button variant="primary" onClick={openAddEquipment}><Icon name="plus" />Novo equipamento</Button>
      </section>
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
          label="Alertas detectados"
          value={dashboardSummary ? String(dashboardSummary.alertas) : "—"}
          detail="Gerados pelas análises disponíveis"
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
      <section className="section-header">
        <div><h2>Equipamentos</h2><span>{uploadedEquipment.length ? "Dispositivos enviados nesta sessão" : "Exemplo exibido até você enviar seu primeiro dispositivo"}</span></div>
        <div className="equipment-tools">
          <div className="filter-tabs">
            {["Todos", "Em alerta"].map((item) => (
              <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)} type="button">
                {item}
              </button>
            ))}
          </div>
          <Button onClick={() => navigate("/equipamentos")}>Ver todos <Icon name="arrow" size="sm" /></Button>
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

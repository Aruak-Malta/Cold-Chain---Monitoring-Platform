import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { EquipmentCard } from "../../components/EquipmentCard/EquipmentCard";
import { Icon } from "../../components/Icon/Icon";
import { equipment } from "../../data/equipment";
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
  const { search, openEquipment, notify } = useOutletContext<AppOutletContext>();
  const [filter, setFilter] = useState("Todos");
  const [acknowledged, setAcknowledged] = useState(false);

  const filteredEquipment = useMemo(() => equipment.filter((item) => {
    const statusMatches =
      filter === "Todos" ||
      (filter === "Em alerta" && ["critical", "warning"].includes(item.status)) ||
      (filter === "Offline" && item.status === "offline");
    return statusMatches && `${item.name} ${item.place}`.toLowerCase().includes(search.toLowerCase());
  }), [filter, search]);

  function acknowledgeAlert() {
    setAcknowledged(true);
    notify("Alerta reconhecido e registrado na auditoria.");
  }

  return (
    <>
      <section className="welcome-row">
        <div><p>VISÃO GERAL</p><h1>Bom dia, Marina.</h1><span>Acompanhe a operação da sua cadeia fria em tempo real.</span></div>
        <div className="live-indicator"><span className="pulse" />Dados ao vivo <small>agora</small></div>
      </section>
      <section className="summary-grid">
        <SummaryCard icon="snow" label="Equipamentos" value="24" detail="22 online · 2 offline" tone="blue" />
        <SummaryCard icon="bell" label="Alertas ativos" value="3" detail="1 crítico · 2 atenção" tone="red" />
        <SummaryCard icon="bolt" label="Consumo este mês" value="8.492 kWh" detail="+6,4% vs. mês anterior" tone="amber" />
        <SummaryCard icon="leaf" label="Custo estimado" value="R$ 7.218" detail="Projeção: R$ 11.840" tone="green" />
      </section>
      {!acknowledged && (
        <section className="critical-alert">
          <div className="alert-symbol"><Icon name="thermometer" /></div>
          <div className="alert-copy">
            <div><span>ALERTA CRÍTICO</span><small>há 4 minutos</small></div>
            <strong>Temperatura acima do limite no Freezer de sorvetes 02</strong>
            <p>Temperatura atual de <b>−10,2°C</b> · Limite configurado: −12°C · Em risco há 8 min</p>
          </div>
          <div className="alert-actions">
            <Button onClick={() => openEquipment(equipment[1])}>Ver equipamento</Button>
            <Button variant="primary" onClick={acknowledgeAlert}><Icon name="check" />Reconhecer alerta</Button>
          </div>
        </section>
      )}
      {acknowledged && (
        <section className="acknowledged-alert">
          <Icon name="check" />
          <span><strong>Alerta reconhecido por Marina Rocha</strong><small>O registro foi adicionado à auditoria operacional.</small></span>
          <Button variant="ghost" onClick={() => setAcknowledged(false)}>Desfazer</Button>
        </section>
      )}
      <section className="section-header">
        <div><h2>Equipamentos</h2><span>Ordenados por prioridade operacional</span></div>
        <div className="equipment-tools">
          <div className="filter-tabs">
            {["Todos", "Em alerta", "Offline"].map((item) => (
              <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)} type="button">
                {item}{item === "Em alerta" && <b>2</b>}
              </button>
            ))}
          </div>
          <Button onClick={() => navigate("/equipamentos")}>Ver todos <Icon name="arrow" size="sm" /></Button>
        </div>
      </section>
      <section className="equipment-grid">
        {filteredEquipment.map((item) => <EquipmentCard key={item.id} equipment={item} onOpen={() => openEquipment(item)} />)}
        {!filteredEquipment.length && <div className="empty-state"><Icon name="search" size="lg" /><strong>Nenhum equipamento encontrado</strong><span>Tente buscar por outro nome ou setor.</span></div>}
      </section>
      <section className="analytics-grid">
        <div className="panel ranking-panel">
          <div className="panel-head"><div><h2>Ranking de consumo</h2><span>Maiores consumidores no mês</span></div><Button variant="ghost" onClick={() => navigate("/analises")}>Ver análise <Icon name="arrow" size="sm" /></Button></div>
          {[
            ["Freezer de sorvetes 02", "Congelados", "bar-100", "816 kWh", "R$ 692"],
            ["Câmara fria — Carnes", "Açougue", "bar-72", "493 kWh", "R$ 418"],
            ["Expositor de bebidas", "Bebidas", "bar-58", "443 kWh", "R$ 376"],
          ].map(([name, sector, bar, value, cost], index) => (
            <div className="ranking-row" key={name}>
              <b>{index + 1}</b><span className="rank-icon"><Icon name="snow" /></span>
              <span className="rank-name"><strong>{name}</strong><small>{sector}</small></span>
              <span className="rank-bar"><i className={bar} /></span>
              <span className="rank-value"><strong>{value}</strong><small>{cost}</small></span>
            </div>
          ))}
        </div>
        <div className="panel recent-panel">
          <div className="panel-head"><div><h2>Atividade recente</h2><span>Alertas e eventos do sistema</span></div><Button variant="ghost" className="icon-button" label="Ver todos os alertas" onClick={() => navigate("/alertas")}><Icon name="more" /></Button></div>
          <div className="activity"><span className="activity-icon red"><Icon name="thermometer" /></span><div><strong>Temperatura crítica detectada</strong><p>Freezer de sorvetes 02</p><small>Há 4 min</small></div></div>
          <div className="activity"><span className="activity-icon gray"><Icon name="wifi" /></span><div><strong>Equipamento ficou offline</strong><p>Câmara fria — Laticínios</p><small>Há 14 min</small></div></div>
          <div className="activity"><span className="activity-icon amber"><Icon name="bolt" /></span><div><strong>Duty cycle acima do esperado</strong><p>Expositor de bebidas</p><small>Há 1h</small></div></div>
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { initialAlerts } from "../../data/alerts";
import { equipment } from "../../data/equipment";
import type { AppOutletContext } from "../../types/AppOutletContext";

export function Alerts() {
  const { notify, openEquipment } = useOutletContext<AppOutletContext>();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("Todos");

  function acknowledge(id: number) {
    setAlerts((currentAlerts) => currentAlerts.map((alert) => (
      alert.id === id ? { ...alert, state: "Reconhecido" } : alert
    )));
    notify("Alerta reconhecido e registrado na auditoria.");
  }

  function acknowledgeAll() {
    setAlerts((currentAlerts) => currentAlerts.map((alert) => ({ ...alert, state: "Reconhecido" })));
    notify("Todos os alertas foram reconhecidos.");
  }

  const filteredAlerts = alerts.filter((alert) => filter === "Todos" || alert.state === filter);

  return (
    <>
      <PageTitle
        eyebrow="CENTRAL DE EVENTOS"
        title="Alertas"
        description="Priorize ocorrências e mantenha a rastreabilidade das ações."
        action={<Button onClick={acknowledgeAll}><Icon name="check" />Reconhecer todos</Button>}
      />
      <div className="alert-summary">
        <div><span className="summary-icon red"><Icon name="bell" /></span><p><strong>1 crítico</strong><small>Requer ação imediata</small></p></div>
        <div><span className="summary-icon amber"><Icon name="clock" /></span><p><strong>2 pendentes</strong><small>Aguardando reconhecimento</small></p></div>
        <div><span className="summary-icon green"><Icon name="check" /></span><p><strong>{alerts.filter((alert) => alert.state === "Reconhecido").length} reconhecidos</strong><small>Nas últimas 24 horas</small></p></div>
      </div>
      <div className="panel alerts-panel">
        <div className="list-controls">
          <div className="filter-tabs">
            {["Todos", "Pendente", "Reconhecido"].map((item) => (
              <button className={filter === item ? "selected" : ""} onClick={() => setFilter(item)} key={item} type="button">
                {item}
              </button>
            ))}
          </div>
          <span>Atualizado agora</span>
        </div>
        {filteredAlerts.map((alert) => (
          <div className="alert-list-row" key={alert.id}>
            <span className={`activity-icon ${alert.level === "critical" ? "red" : alert.level === "warning" ? "amber" : alert.level === "normal" ? "green" : "gray"}`}>
              <Icon name={alert.icon} />
            </span>
            <div className="alert-main"><strong>{alert.title}</strong><p>{alert.equipment} · <b>{alert.value}</b></p></div>
            <span className="alert-time">{alert.time}</span>
            <span className={`audit-state ${alert.state === "Reconhecido" ? "done" : ""}`}>{alert.state}</span>
            <div className="row-actions">
              <Button variant="ghost" onClick={() => openEquipment(equipment.find((item) => item.name === alert.equipment) ?? equipment[0])}>Detalhes</Button>
              {alert.state === "Pendente" && <Button variant="primary" onClick={() => acknowledge(alert.id)}><Icon name="check" size="sm" />Reconhecer</Button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

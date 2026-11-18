import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { getSessionAlerts } from "../../services/sessionAlertService";
import { toEquipment } from "../../services/sessionEquipmentService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import type { Alert, AlertState } from "../../types/Alert";

function alertState(alert: Alert, acknowledgedIds: string[]): AlertState {
  return acknowledgedIds.includes(alert.id) ? "Reconhecido" : "Pendente";
}

export function Alerts() {
  const {
    sessionEquipments,
    equipmentLoadError,
    acknowledgedAlertIds,
    acknowledgeAlerts,
    notify,
    openEquipment,
  } =
    useOutletContext<AppOutletContext>();
  const [filter, setFilter] = useState<"Todos" | AlertState>("Todos");

  const generatedAlerts = useMemo(
    () => equipmentLoadError ? [] : getSessionAlerts(sessionEquipments),
    [equipmentLoadError, sessionEquipments],
  );
  const alerts = generatedAlerts.map((alert) => ({
    ...alert,
    state: alertState(alert, acknowledgedAlertIds),
  }));
  const pendingAlerts = alerts.filter((alert) => alert.state === "Pendente");
  const filteredAlerts = alerts.filter((alert) => filter === "Todos" || alert.state === filter);
  const criticalCount = pendingAlerts.filter((alert) => alert.level === "critical").length;
  const warningCount = pendingAlerts.filter((alert) => alert.level === "warning").length;
  const acknowledgedCount = alerts.length - pendingAlerts.length;
  const equipmentWithReports = sessionEquipments.filter((equipment) =>
    equipment.analise_avancada?.termica || equipment.analise_avancada?.eletrica,
  ).length;
  const equipmentWithoutReports = sessionEquipments.length - equipmentWithReports;
  const equipmentBySerial = new Map(
    sessionEquipments.map((equipment, index) => [equipment.serial, { equipment, index }]),
  );

  function acknowledge(ids: string[]) {
    const saved = acknowledgeAlerts(ids);
    if (saved) {
      notify(ids.length === 1
        ? "Aviso reconhecido nesta sessão."
        : "Todos os avisos foram reconhecidos nesta sessão.");
    } else {
      notify("Aviso reconhecido apenas até a página ser recarregada; o navegador não permitiu salvar a sessão.");
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="CENTRAL DE EVENTOS"
        title="Avisos"
        description="Ocorrências derivadas dos laudos térmicos e elétricos dos equipamentos enviados."
        action={
          <Button
            className="alerts-acknowledge-all"
            disabled={!pendingAlerts.length}
            onClick={() => acknowledge(pendingAlerts.map((alert) => alert.id))}
          >
            <Icon name="check" /><span>Reconhecer todos</span>
          </Button>
        }
      />

      <div className="alert-summary">
        <div>
          <span className="summary-icon red"><Icon name="bolt" /></span>
          <p><strong>{criticalCount} críticos</strong><small>Exigem atenção prioritária</small></p>
        </div>
        <div>
          <span className="summary-icon amber"><Icon name="thermometer" /></span>
          <p><strong>{warningCount} em atenção</strong><small>Condições identificadas nos laudos</small></p>
        </div>
        <div>
          <span className="summary-icon green"><Icon name="check" /></span>
          <p><strong>{acknowledgedCount} reconhecidos</strong><small>Nesta sessão do navegador</small></p>
        </div>
      </div>

      {equipmentLoadError ? (
        <div className="panel alerts-empty" role="alert">{equipmentLoadError}</div>
      ) : (
        <div className="panel alerts-panel">
          <div className="list-controls">
            <div className="filter-tabs" aria-label="Filtrar avisos">
              {(["Todos", "Pendente", "Reconhecido"] as const).map((item) => (
                <button
                  aria-pressed={filter === item}
                  className={filter === item ? "selected" : ""}
                  onClick={() => setFilter(item)}
                  key={item}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <span>{alerts.length} aviso(s) nos laudos carregados</span>
          </div>

          {filteredAlerts.map((alert) => {
            const equipmentEntry = equipmentBySerial.get(alert.equipmentSerial);
            return (
              <div className="alert-list-row" key={alert.id}>
                <span className={`activity-icon ${alert.level === "critical" ? "red" : "amber"}`}>
                  <Icon name={alert.icon} />
                </span>
                <div className="alert-main">
                  <strong>{alert.title}</strong>
                  <p>{alert.equipmentName} · MAC Address {alert.equipmentSerial}</p>
                  <p>{alert.detail}</p>
                </div>
                <span className="alert-measurement">{alert.value}</span>
                <span className="alert-time">{alert.time}</span>
                <span className={`audit-state ${alert.state === "Reconhecido" ? "done" : ""}`}>
                  {alert.state}
                </span>
                <div className="row-actions">
                  {equipmentEntry && (
                    <Button
                      variant="ghost"
                      onClick={() => openEquipment(toEquipment(equipmentEntry.equipment, equipmentEntry.index))}
                    >
                      Detalhes
                    </Button>
                  )}
                  {alert.state === "Pendente" && (
                    <Button variant="primary" onClick={() => acknowledge([alert.id])}>
                      <Icon name="check" size="sm" />Reconhecer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {!filteredAlerts.length && (
            <div className="alerts-empty">
              {sessionEquipments.length === 0
                ? "Nenhum dispositivo foi enviado nesta sessão. Envie um JSON para gerar laudos e avisos baseados nos dados."
                : equipmentWithReports === 0
                  ? "Ainda não há laudos térmicos ou elétricos disponíveis. Envie telemetria com pelo menos 30 valores numéricos válidos da grandeza para que o backend possa analisá-la."
                  : alerts.length === 0
                    ? `Nenhuma condição de alerta foi identificada nos laudos de ${equipmentWithReports} ${equipmentWithReports === 1 ? "equipamento" : "equipamentos"}.${equipmentWithoutReports ? ` ${equipmentWithoutReports} ${equipmentWithoutReports === 1 ? "equipamento ainda não tem" : "equipamentos ainda não têm"} laudo suficiente para avaliação.` : " Todos os equipamentos com laudo disponível foram avaliados."}`
                  : filter === "Pendente"
                    ? "Não há avisos pendentes."
                    : "Não há avisos reconhecidos."}
            </div>
          )}
        </div>
      )}
    </>
  );
}

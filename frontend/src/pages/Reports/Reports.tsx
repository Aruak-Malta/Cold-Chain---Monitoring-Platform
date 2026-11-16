import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { exportReport, getReportMonthOptions } from "../../services/reportService";
import type { ReportKind } from "../../services/reportService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import type { IconName } from "../../types/Icon";

const reportTemplates: {
  title: string;
  description: string;
  icon: IconName;
  kind: ReportKind;
}[] = [
  { title: "Relatório de gestão mensal", description: "Consumo, custos, alertas e Health Score.", icon: "file", kind: "management" },
  { title: "Auditoria de alertas", description: "Log inalterável com usuários e reconhecimentos.", icon: "bell", kind: "alerts" },
  { title: "Eficiência energética", description: "Ranking, projeções e oportunidades de economia.", icon: "bolt", kind: "energy" },
  { title: "Dados brutos de telemetria", description: "Leituras sincronizadas para análise externa.", icon: "chart", kind: "telemetry" },
];

export function Reports() {
  const { sessionScope, notify } = useOutletContext<AppOutletContext>();
  const [currentMonth, previousMonth] = getReportMonthOptions();
  const [period, setPeriod] = useState(currentMonth);

  async function generateReport(name: string, kind: ReportKind) {
    try {
      await exportReport(name, period, kind, sessionScope);
      notify(`${name} exportado em ${kind === "telemetry" ? "CSV" : "PDF"}.`);
    } catch (error) {
      console.error(`Não foi possível gerar ${name}:`, error);
      notify(error instanceof Error ? `Falha ao gerar relatório: ${error.message}` : "Falha ao gerar o relatório.");
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="GESTÃO E AUDITORIA"
        title="Relatórios"
        description="Exporte indicadores consolidados para sua equipe."
        action={<Button variant="primary" onClick={() => void generateReport("Relatório consolidado", "consolidated")}><Icon name="file" />Gerar relatório</Button>}
      />
      <div className="report-builder panel">
        <div><span className="summary-icon blue"><Icon name="file" /></span><div><h2>Gerar novo relatório</h2><p>Escolha o período e exporte os dados consolidados.</p></div></div>
        <label className="select-field">Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>{currentMonth}</option><option>{previousMonth}</option><option>Últimos 7 dias</option><option>Período personalizado</option></select></label>
        <Button variant="primary" onClick={() => void generateReport("Relatório mensal", "management")}>Exportar PDF</Button>
      </div>
      <h2 className="subsection-title">Modelos disponíveis</h2>
      <div className="report-grid">
        {reportTemplates.map(({ title, description, icon, kind }) => (
          <div className="panel report-card" key={title}>
            <span className="summary-icon blue"><Icon name={icon} /></span>
            <h3>{title}</h3><p>{description}</p>
            <div><small>PDF · CSV</small><Button onClick={() => void generateReport(title, kind)}>Exportar <Icon name="arrow" size="sm" /></Button></div>
          </div>
        ))}
      </div>
      <div className="panel schedule-card">
        <span className="summary-icon green"><Icon name="clock" /></span>
        <div><h3>Envio automático semanal</h3><p>Toda segunda-feira às 08:00 para 3 supervisores.</p></div>
        <label className="switch">
          <input type="checkbox" defaultChecked onChange={(event) => notify(event.target.checked ? "Envio automático ativado." : "Envio automático pausado.")} />
          <span />
        </label>
      </div>
    </>
  );
}

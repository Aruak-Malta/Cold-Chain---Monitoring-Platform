import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { exportReport } from "../../services/reportService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import type { IconName } from "../../types/Icon";

export function Reports() {
  const { notify } = useOutletContext<AppOutletContext>();
  const [period, setPeriod] = useState("Junho de 2025");

  function generateReport(name: string) {
    exportReport(name, period);
    notify(`${name} gerado com sucesso.`);
  }

  return (
    <>
      <PageTitle
        eyebrow="GESTÃO E AUDITORIA"
        title="Relatórios"
        description="Exporte indicadores consolidados para sua equipe."
        action={<Button variant="primary" onClick={() => generateReport("Relatório consolidado")}><Icon name="file" />Gerar relatório</Button>}
      />
      <div className="report-builder panel">
        <div><span className="summary-icon blue"><Icon name="file" /></span><div><h2>Gerar novo relatório</h2><p>Escolha o período e exporte os dados consolidados.</p></div></div>
        <label className="select-field">Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Junho de 2025</option><option>Maio de 2025</option><option>Últimos 7 dias</option><option>Período personalizado</option></select></label>
        <Button variant="primary" onClick={() => generateReport("Relatório mensal")}>Exportar PDF</Button>
      </div>
      <h2 className="subsection-title">Modelos disponíveis</h2>
      <div className="report-grid">
        {[
          ["Relatório de gestão mensal", "Consumo, custos, alertas e Health Score.", "file"],
          ["Auditoria de alertas", "Log inalterável com usuários e reconhecimentos.", "bell"],
          ["Eficiência energética", "Ranking, projeções e oportunidades de economia.", "bolt"],
          ["Dados brutos de telemetria", "Leituras sincronizadas para análise externa.", "chart"],
        ].map(([title, description, icon]) => (
          <div className="panel report-card" key={title}>
            <span className="summary-icon blue"><Icon name={icon as IconName} /></span>
            <h3>{title}</h3><p>{description}</p>
            <div><small>PDF · CSV</small><Button onClick={() => generateReport(title)}>Exportar <Icon name="arrow" size="sm" /></Button></div>
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

import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import type { AppOutletContext } from "../../types/AppOutletContext";



export function Analytics() {
  const { notify } = useOutletContext<AppOutletContext>();
  const [metric, setMetric] = useState("Consumo");
  const [period, setPeriod] = useState("30 dias");

  return (
    <>
      <PageTitle
        eyebrow="INTELIGÊNCIA OPERACIONAL"
        title="Análises"
        description="Compare eficiência térmica, consumo e saúde dos equipamentos."
        action={<label className="select-field compact">Período<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>24 horas</option><option>7 dias</option><option>30 dias</option><option>Este ano</option></select></label>}
      />
      <div className="analysis-kpis">
        <div><small>Eficiência média</small><strong>84,2%</strong><span className="positive">+2,4% no período</span></div>
        <div><small>Consumo total</small><strong>8.492 kWh</strong><span className="negative">+6,4% no período</span></div>
        <div><small>Economia potencial</small><strong>R$ 1.284</strong><span>Com ações sugeridas</span></div>
        <div><small>CO₂ evitável</small><strong>286 kg</strong><span>Equivalente mensal</span></div>
      </div>
      <div className="panel comparison-panel">
        <div className="panel-head">
          <div><h2>Comparativo entre equipamentos</h2><span>Desempenho consolidado nos últimos {period.toLowerCase()}</span></div>
          <div className="filter-tabs">
            {["Consumo", "Saúde", "Duty cycle"].map((item) => (
              <button className={metric === item ? "selected" : ""} onClick={() => setMetric(item)} key={item} type="button">{item}</button>
            ))}
          </div>
        </div>
        <div className="bar-chart">
          <div className="bar-y"><span>800</span><span>600</span><span>400</span><span>200</span><span>0</span></div>
          <div className="bars">
            {[["Sorvetes 02", "bar-h-90", "816"], ["Carnes", "bar-h-63", "493"], ["Bebidas", "bar-h-56", "443"], ["Laticínios", "bar-h-42", "321"]].map(([name, height, value], index) => (
              <div className="bar-column" key={name}>
                <span className={`chart-bar ${height} ${index === 0 ? "danger" : ""}`}>
                  <b>{metric === "Consumo" ? `${value} kWh` : metric === "Saúde" ? `${[58, 96, 84, 72][index]} pts` : `${[82, 61, 68, 57][index]}%`}</b>
                </span>
                <small>{name}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="insight-grid">
        <div className="panel insight-card"><span className="summary-icon red"><Icon name="bolt" /></span><div><small>OPORTUNIDADE DE ECONOMIA</small><strong>Freezer de sorvetes consome 38% acima da média</strong><p>Uma revisão do compressor pode reduzir até R$ 184 por mês.</p><Button variant="ghost" onClick={() => notify("Recomendação adicionada ao plano de manutenção.")}>Adicionar ao plano <Icon name="arrow" size="sm" /></Button></div></div>
        <div className="panel insight-card"><span className="summary-icon green"><Icon name="leaf" /></span><div><small>MELHOR DESEMPENHO</small><strong>Câmara fria — Carnes mantém alta eficiência</strong><p>Health Score 96 e estabilidade térmica de 99,4%.</p><Button variant="ghost" onClick={() => notify("Boas práticas copiadas para a área de relatórios.")}>Ver boas práticas <Icon name="arrow" size="sm" /></Button></div></div>
      </div>
    </>
  );
}

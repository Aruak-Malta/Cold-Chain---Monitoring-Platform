import { useState } from "react";
import type { Equipment } from "../../types/Equipment";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { StatusPill } from "../StatusPill/StatusPill";

type DetailDrawerProps = {
  equipment: Equipment;
  onClose: () => void;
};

export function DetailDrawer({ equipment, onClose }: Readonly<DetailDrawerProps>) {
  const [period, setPeriod] = useState("24h");

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="Fechar detalhes" onClick={onClose} type="button" />
      <aside className="drawer">
        <div className="drawer-header">
          <div><StatusPill status={equipment.status} /><h2>{equipment.name}</h2><p>{equipment.place}</p></div>
          <Button variant="ghost" className="icon-button" label="Fechar" onClick={onClose}><Icon name="close" /></Button>
        </div>
        <div className="drawer-score">
          <span className="score-ring">{equipment.health}<small>/100</small></span>
          <div>
            <small>HEALTH SCORE</small>
            <strong>{equipment.health < 70 ? "Requer atenção" : "Boa condição"}</strong>
            <p>{equipment.health < 70 ? "Queda de 12 pontos nos últimos 30 dias." : "Operação estável nos últimos 30 dias."}</p>
          </div>
        </div>
        <div className="drawer-section-head">
          <div><h3>Telemetria</h3><p>Atualização em tempo real</p></div>
          <div className="period-tabs">
            {["1h", "24h", "7d"].map((item) => (
              <button className={period === item ? "selected" : ""} onClick={() => setPeriod(item)} key={item} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="detail-chart">
          <div className="chart-labels"><span>-5°</span><span>-10°</span><span>-15°</span><span>-20°</span></div>
          <svg viewBox="0 0 560 210" preserveAspectRatio="none">
            <defs><linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".2" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
            <path className="grid-lines" d="M0 20H560M0 75H560M0 130H560M0 185H560" />
            <path className="threshold" d="M0 58H560" />
            <path className="chart-fill" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45 L560 210 L0 210Z" />
            <path className="chart-line" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45" />
          </svg>
          <span className="limit-label">Limite máx. −12°</span>
          <div className="chart-times"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>Agora</span></div>
        </div>
        <div className="drawer-metrics">
          <div><span className="metric-icon"><Icon name="bolt" /></span><small>Consumo mensal</small><strong>486,2 kWh</strong><p>+18% vs. mês anterior</p></div>
          <div><span className="metric-icon"><Icon name="clock" /></span><small>Duty cycle</small><strong>82%</strong><p>Acima do ideal de 65%</p></div>
        </div>
        <Button variant="primary" className="full-button">Abrir análise completa <Icon name="arrow" /></Button>
      </aside>
    </div>
  );
}

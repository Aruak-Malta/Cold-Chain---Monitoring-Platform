import { useEffect, useMemo, useState } from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { toEquipment } from "../../services/sessionEquipmentService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import type { SessionEquipmentRecord } from "../../services/sessionEquipmentService";

type ComparisonMetric = "health" | "duty" | "thermal";
type Diagnostic = "temperature" | "humidity" | "current" | "health";
type HoveredInvestigationPoint = {
  index: number;
  x: number;
  y: number;
  value: number;
  tooltipLeft: number;
  tooltipTop: number;
};

const comparisonMetrics: Array<{ id: ComparisonMetric; label: string }> = [
  { id: "health", label: "Health Score" },
  { id: "duty", label: "Duty cycle" },
  { id: "thermal", label: "Risco térmico" },
];

const diagnostics: Array<{ id: Diagnostic; label: string; icon: "thermometer" | "drop" | "bolt" | "chart" }> = [
  { id: "temperature", label: "Temperatura", icon: "thermometer" },
  { id: "humidity", label: "Umidade", icon: "drop" },
  { id: "current", label: "Corrente", icon: "bolt" },
  { id: "health", label: "Saúde", icon: "chart" },
];

function comparisonValue(equipment: SessionEquipmentRecord, metric: ComparisonMetric): number | null {
  const analysis = equipment.analise_avancada;
  if (!analysis) return null;
  if (metric === "health") return analysis.saude.health_score;
  if (metric === "duty") return analysis.eletrica?.duty_cycle_percentual ?? null;
  return analysis.termica?.percentual_tempo_em_risco ?? null;
}

function formatValue(value: number | null | undefined, unit = ""): string {
  return value === null || value === undefined ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}${unit}`;
}

function formatChartTime(value: string | null | undefined): string {
  if (!value) return "Horário indisponível";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getTelemetrySeries(equipment: SessionEquipmentRecord, diagnostic: Diagnostic): (number | null)[] {
  const chart = equipment.telemetria?.dados_graficos;
  if (!chart) return [];
  if (diagnostic === "temperature") return chart.temperaturas_suavizadas;
  if (diagnostic === "humidity") return chart.umidades_suavizadas;
  return chart.correntes_suavizadas;
}

function createLinePath(values: (number | null)[], minimum: number, maximum: number): string {
  const validValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!validValues.length) return "";
  const range = maximum - minimum || 1;
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      drawing = false;
      return;
    }
    const x = values.length < 2 ? 450 : 20 + (index / (values.length - 1)) * 860;
    const y = 210 - ((value - minimum) / range) * 180;
    path += `${drawing ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)} `;
    drawing = true;
  });
  return path.trim();
}

function TelemetryChart({ equipment, diagnostic, label, color }: Readonly<{
  equipment: SessionEquipmentRecord;
  diagnostic: Diagnostic;
  label: string;
  color: string;
}>) {
  const [hoveredPoint, setHoveredPoint] = useState<HoveredInvestigationPoint | null>(null);
  const values = getTelemetrySeries(equipment, diagnostic);
  const validValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!validValues.length) {
    return <div className="analysis-empty">Não há leituras válidas de {label.toLowerCase()} para exibir neste equipamento.</div>;
  }

  const minimum = Math.min(...validValues);
  const maximum = Math.max(...validValues);
  const path = createLinePath(values, minimum, maximum);
  const times = equipment.telemetria?.dados_graficos.tempos ?? [];
  return (
    <div className="investigation-chart">
      <div className="investigation-chart-head">
        <div><h3>Histórico de {label.toLowerCase()}</h3><p>Série suavizada calculada no backend · {validValues.length} leituras válidas</p></div>
        <strong>{formatValue(equipment.telemetria?.resumo_analise[
          diagnostic === "temperature" ? "temperatura_media" :
          diagnostic === "humidity" ? "umidade_media" : "corrente_maxima"
        ], diagnostic === "current" ? " A" : diagnostic === "temperature" ? " °C" : "%")}</strong>
      </div>
      <div
        className="investigation-plot"
        onPointerLeave={() => setHoveredPoint(null)}
      >
        <svg
          viewBox="0 0 900 240"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Série de ${label.toLowerCase()} do equipamento ${equipment.nome}`}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const pointerX = ((event.clientX - bounds.left) / bounds.width) * 900;
            const plotBounds = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!plotBounds) return;
            const nearestIndex = values.reduce<number | null>((nearest, value, index) => {
              if (value === null || !Number.isFinite(value)) return nearest;
              const x = values.length < 2 ? 450 : 20 + (index / (values.length - 1)) * 860;
              return nearest === null ||
                Math.abs(x - pointerX) < Math.abs((values.length < 2 ? 450 : 20 + (nearest / (values.length - 1)) * 860) - pointerX)
                ? index
                : nearest;
            }, null);
            if (nearestIndex === null) {
              setHoveredPoint(null);
              return;
            }
            const value = values[nearestIndex];
            if (value === null) {
              setHoveredPoint(null);
              return;
            }
            const point = {
              x: values.length < 2 ? 450 : 20 + (nearestIndex / (values.length - 1)) * 860,
              y: 210 - ((value - minimum) / (maximum - minimum || 1)) * 180,
            };
            const pointLeft = bounds.left - plotBounds.left + (point.x / 900) * bounds.width;
            const pointTop = bounds.top - plotBounds.top + (point.y / 240) * bounds.height;
            setHoveredPoint({
              ...point,
              index: nearestIndex,
              value,
              tooltipLeft: Math.max(8, Math.min(pointLeft - 72, plotBounds.width - 152)),
              tooltipTop: Math.max(8, pointTop - 48),
            });
          }}
        >
          <path className="investigation-grid" d="M0 30H900M0 90H900M0 150H900M0 210H900" />
          <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hoveredPoint && (
            <circle className="investigation-hover-point" cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill={color} />
          )}
        </svg>
        {hoveredPoint && (
          <div
            className="investigation-hover-tooltip"
            role="tooltip"
            style={{ left: hoveredPoint.tooltipLeft, top: hoveredPoint.tooltipTop }}
          >
            <strong>{formatValue(hoveredPoint.value, diagnostic === "current" ? " A" : diagnostic === "temperature" ? " °C" : "%")}</strong>
            <span>{formatChartTime(times[hoveredPoint.index])}</span>
          </div>
        )}
      </div>
      <div className="investigation-time-axis">
        <span>{formatChartTime(times.find((time) => time !== null))}</span>
        <span>{formatChartTime([...times].reverse().find((time) => time !== null))}</span>
      </div>
      <div className="investigation-chart-range"><span>Mínimo na série suavizada: {formatValue(minimum, diagnostic === "current" ? " A" : diagnostic === "temperature" ? " °C" : "%")}</span><span>Máximo na série suavizada: {formatValue(maximum, diagnostic === "current" ? " A" : diagnostic === "temperature" ? " °C" : "%")}</span></div>
    </div>
  );
}

function ThermalReport({ equipment }: Readonly<{ equipment: SessionEquipmentRecord }>) {
  const report = equipment.analise_avancada?.termica;
  if (!report) {
    return <div className="analysis-empty">O laudo térmico não está disponível. Verifique se o JSON contém leituras suficientes de temperatura.</div>;
  }

  return (
    <>
      <div className="investigation-metrics">
        <Metric label="Setpoint aprendido" value={formatValue(report.setpoint_aprendido, " °C")} />
        <Metric label="Limite crítico calculado" value={formatValue(report.limite_critico_calculado, " °C")} />
        <Metric label="Tempo em risco" value={formatValue(report.percentual_tempo_em_risco, "%")} />
        <Metric label="Tendência de aquecimento" value={formatValue(report.tendencia_aquecimento_graus, " °C")} />
      </div>
      <TelemetryChart equipment={equipment} diagnostic="temperature" label="Temperatura" color="#2a9e90" />
      <div className="analysis-note">Base temporal do laudo: {report.base_temporal === "timestamps" ? "timestamps válidos" : "ordem das leituras"}{report.falha_preditiva_detectada ? " · alerta preditivo detectado" : " · nenhum alerta preditivo detectado"}.</div>
    </>
  );
}

function ElectricalReport({ equipment }: Readonly<{ equipment: SessionEquipmentRecord }>) {
  const report = equipment.analise_avancada?.eletrica;
  if (!report) {
    return <div className="analysis-empty">O laudo elétrico não está disponível. Verifique se o JSON contém leituras suficientes de corrente.</div>;
  }

  return (
    <>
      <div className="investigation-metrics">
        <Metric label="Duty cycle" value={formatValue(report.duty_cycle_percentual, "%")} />
        <Metric label="Corrente de trabalho média" value={formatValue(report.corrente_trabalho_media, " A")} />
        <Metric label="Pico de corrente observado" value={formatValue(report.corrente_pico_partida, " A")} />
        <Metric label="Partidas observadas" value={formatValue(report.partidas_observadas)} />
      </div>
      <TelemetryChart equipment={equipment} diagnostic="current" label="Corrente" color="#d99a3d" />
      <div className="analysis-note">
        {report.alerta_esforco_critico || report.alerta_compressor_travando
          ? "O laudo elétrico identificou alerta(s): " +
            [
              report.alerta_esforco_critico ? "esforço crítico" : "",
              report.alerta_compressor_travando ? "possível compressor travando" : "",
            ].filter(Boolean).join(" e ") + "."
          : "O laudo elétrico não identificou alertas de esforço crítico ou travamento."}
      </div>
    </>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="investigation-metric"><small>{label}</small><strong>{value}</strong></div>;
}

function HealthReport({ equipment }: Readonly<{ equipment: SessionEquipmentRecord }>) {
  const report = equipment.analise_avancada?.saude;
  if (!report) return <div className="analysis-empty">O laudo de saúde ainda não está disponível para este equipamento.</div>;
  const statusClass = report.status_geral === "Crítico"
    ? "health-critical"
    : report.status_geral === "Atenção" ? "health-warning" : "";
  return (
    <div className="health-investigation">
      <div className={`health-investigation-score ${statusClass}`}>
        <span>HEALTH SCORE</span>
        <strong>{formatValue(report.health_score)}<small>{report.health_score === null ? "" : "/100"}</small></strong>
        <b>{report.status_geral}</b>
      </div>
      <div className="health-investigation-factors">
        <h3>Fatores identificados na análise</h3>
        {report.fatores_de_risco.length
          ? <ul>{report.fatores_de_risco.map((factor, index) => <li key={`${factor}-${index}`}>{factor}</li>)}</ul>
          : <p>Nenhum fator de risco foi retornado pelo laudo.</p>}
      </div>
    </div>
  );
}

export function Analytics() {
  const location = useLocation();
  const routeState = location.state as { selectedSerial?: string } | null;
  const { sessionEquipments, equipmentLoadError, dashboardSummary, dashboardSummaryError, openEquipment } =
    useOutletContext<AppOutletContext>();
  const [metric, setMetric] = useState<ComparisonMetric>("health");
  const [selectedSerial, setSelectedSerial] = useState(routeState?.selectedSerial ?? "");
  const [diagnostic, setDiagnostic] = useState<Diagnostic>("temperature");

  useEffect(() => {
    if (routeState?.selectedSerial) {
      setSelectedSerial(routeState.selectedSerial);
    }
  }, [routeState?.selectedSerial]);

  const selected = sessionEquipments.find((equipment) => equipment.serial === selectedSerial) ?? sessionEquipments[0];
  const comparableEquipments = useMemo(
    () => sessionEquipments
      .map((equipment) => ({ equipment, value: comparisonValue(equipment, metric) }))
      .filter((item): item is { equipment: SessionEquipmentRecord; value: number } => item.value !== null)
      .sort((a, b) => metric === "health" ? a.value - b.value : b.value - a.value),
    [metric, sessionEquipments],
  );

  return (
    <>
      <PageTitle
        eyebrow="INTELIGÊNCIA PREDITIVA"
        title="Análises"
        description="Compare os laudos calculados e investigue os dados reais de cada equipamento."
      />

      {dashboardSummaryError && <div className="analysis-load-error" role="alert">{dashboardSummaryError}</div>}
      <div className="analysis-kpis predictive-kpis">
        <div><span className="kpi-icon teal"><Icon name="chart" /></span><small>Health Score médio</small><strong>{formatValue(dashboardSummary?.health_score_medio)}</strong><span>{dashboardSummary?.analises_concluidas ?? "—"} laudo(s) concluído(s)</span></div>
        <div><span className="kpi-icon red"><Icon name="bolt" /></span><small>Equipamentos críticos</small><strong>{dashboardSummary?.riscos_criticos ?? "—"}</strong><span>Classificados como críticos no laudo de saúde</span></div>
        <div><span className="kpi-icon amber"><Icon name="clock" /></span><small>Duty cycle médio</small><strong>{formatValue(dashboardSummary?.duty_cycle_medio, "%")}</strong><span>Calculado sobre os laudos elétricos disponíveis</span></div>
        <div><span className="kpi-icon blue"><Icon name="snow" /></span><small>Equipamentos analisados</small><strong>{dashboardSummary?.analises_concluidas ?? "—"}</strong><span>De {dashboardSummary?.total_equipamentos ?? "—"} cadastrados nesta sessão</span></div>
      </div>

      <section className="panel comparison-panel">
        <div className="panel-head comparison-head">
          <div>
            <span className="section-kicker">VISÃO DA FROTA</span>
            <h2>Comparativo entre equipamentos</h2>
            <span>Somente laudos disponíveis para os equipamentos desta sessão.</span>
          </div>
          <div className="filter-tabs" aria-label="Métrica de comparação">
            {comparisonMetrics.map((item) => (
              <button
                aria-pressed={metric === item.id}
                className={metric === item.id ? "selected" : ""}
                key={item.id}
                onClick={() => setMetric(item.id)}
                type="button"
              >{item.label}</button>
            ))}
          </div>
        </div>
        {equipmentLoadError ? (
          <div className="analysis-empty" role="alert">{equipmentLoadError}</div>
        ) : comparableEquipments.length ? (
          <div className="horizontal-comparison">
            {comparableEquipments.map(({ equipment, value }) => (
              <button
                aria-label={`Investigar ${equipment.nome}: ${formatValue(value, metric === "health" ? " pontos" : "%")}`}
                aria-pressed={selected?.serial === equipment.serial}
                className={`horizontal-comparison-row ${selected?.serial === equipment.serial ? "active" : ""}`}
                key={equipment.serial}
                onClick={() => setSelectedSerial(equipment.serial)}
                type="button"
              >
                <span className="comparison-equipment"><strong>{equipment.nome}</strong><small>{equipment.setor || "Sem setor"} · MAC Address {equipment.serial}</small></span>
                <span className="comparison-track"><i className={equipment.analise_avancada?.saude.status_geral === "Crítico" ? "critical" : ""} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></span>
                <strong className="comparison-number">{formatValue(value, metric === "health" ? " pts" : "%")}</strong>
              </button>
            ))}
            <div className="comparison-scale"><span>0</span><span>{metric === "health" ? "100 pontos" : "100%"}</span></div>
            <div className="chart-legend"><small>Selecione uma barra para investigar o equipamento.</small><small>Equipamentos sem o laudo desta métrica não são comparados.</small></div>
          </div>
        ) : (
          <div className="analysis-empty">
            {sessionEquipments.length === 0
              ? "Nenhum equipamento foi enviado nesta sessão. Cadastre um dispositivo com telemetria JSON para iniciar as análises."
              : "Ainda não há laudos com esta métrica. Envie telemetria suficiente e aguarde a análise do equipamento."}
          </div>
        )}
      </section>

      <section className="equipment-analysis">
        <div className="analysis-context">
          <div>
            <span className="section-kicker">INVESTIGAÇÃO DO EQUIPAMENTO</span>
            <h2>{selected?.nome ?? "Nenhum equipamento disponível"}</h2>
            <p>{selected ? `${selected.setor || "Sem setor"} · MAC Address ${selected.serial}` : "Cadastre telemetria para iniciar uma investigação."}</p>
          </div>
          {selected && (
            <div className="analysis-investigation-actions">
              <label className="select-field compact">
                Equipamento
                <select value={selected.serial} onChange={(event) => setSelectedSerial(event.target.value)}>
                  {sessionEquipments.map((equipment) => <option key={equipment.serial} value={equipment.serial}>{equipment.nome}</option>)}
                </select>
              </label>
              <button className="button button-secondary" onClick={() => openEquipment(toEquipment(selected, sessionEquipments.indexOf(selected)))} type="button">Abrir detalhes</button>
            </div>
          )}
        </div>

        {selected ? (
          <>
            <div className="diagnostic-summary">
              <HealthReport equipment={selected} />
              {selected.analise_avancada?.termica && (
                <div className="health-factors">
                  <div className="factor-head"><span>Resumo térmico calculado</span><small>dados do laudo</small></div>
                  <div><span>Temperatura média</span><strong>{formatValue(selected.telemetria?.resumo_analise.temperatura_media, " °C")}</strong></div>
                  <div><span>Percentual em risco</span><strong>{formatValue(selected.analise_avancada.termica.percentual_tempo_em_risco, "%")}</strong></div>
                  <div><span>Alerta preditivo</span><strong>{selected.analise_avancada.termica.falha_preditiva_detectada ? "Detectado" : "Não detectado"}</strong></div>
                </div>
              )}
              {selected.analise_avancada?.eletrica && (
                <div className={`critical-diagnosis ${selected.analise_avancada.eletrica.alerta_esforco_critico || selected.analise_avancada.eletrica.alerta_compressor_travando ? "diagnosis-warning" : "diagnosis-stable"}`}>
                  <span className="critical-icon"><Icon name={selected.analise_avancada.eletrica.alerta_esforco_critico || selected.analise_avancada.eletrica.alerta_compressor_travando ? "bolt" : "check"} /></span>
                  <div>
                    <small>LAUDO ELÉTRICO</small>
                    <strong>{selected.analise_avancada.eletrica.alerta_esforco_critico || selected.analise_avancada.eletrica.alerta_compressor_travando ? "Alerta identificado" : "Sem alerta identificado"}</strong>
                    <p>Duty cycle calculado: {formatValue(selected.analise_avancada.eletrica.duty_cycle_percentual, "%")}.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="diagnostic-tabs" role="tablist" aria-label="Investigações disponíveis">
              {diagnostics.map((item) => (
                <button
                  aria-selected={diagnostic === item.id}
                  className={diagnostic === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => setDiagnostic(item.id)}
                  role="tab"
                  type="button"
                ><Icon name={item.icon} size="sm" />{item.label}</button>
              ))}
            </div>
            <div className="analysis-chart-panel">
              {diagnostic === "temperature" && <ThermalReport equipment={selected} />}
              {diagnostic === "humidity" && (
                <>
                  <div className="investigation-metrics">
                    <Metric label="Umidade média calculada" value={formatValue(selected.telemetria?.resumo_analise.umidade_media, "%")} />
                  </div>
                  <TelemetryChart equipment={selected} diagnostic="humidity" label="Umidade" color="#65a7cf" />
                </>
              )}
              {diagnostic === "current" && <ElectricalReport equipment={selected} />}
              {diagnostic === "health" && <HealthReport equipment={selected} />}
            </div>
          </>
        ) : (
          <div className="analysis-empty">A investigação individual será exibida aqui quando houver equipamentos cadastrados nesta sessão.</div>
        )}
      </section>
    </>
  );
}

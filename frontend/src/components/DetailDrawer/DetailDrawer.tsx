import { useMemo, useState } from "react";
import type { Equipment } from "../../types/Equipment";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { StatusPill } from "../StatusPill/StatusPill";

type DetailDrawerProps = {
  equipment: Equipment;
  onClose: () => void;
};

type ChartMetricKey = "temperatura" | "umidade" | "corrente";

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  index: number;
};

type HoveredChartPoint = ChartPoint & {
  tooltipLeft: number;
  tooltipTop: number;
};

type ChartSeries = {
  key: ChartMetricKey;
  label: string;
  unit: string;
  values: (number | null)[];
  latestValue: number | null;
  minimum: number;
  maximum: number;
  path: string;
  points: (ChartPoint | null)[];
  singlePoint: { x: number; y: number } | null;
};

const chartMetrics: { key: ChartMetricKey; label: string; unit: string }[] = [
  { key: "temperatura", label: "Temperatura", unit: " °C" },
  { key: "umidade", label: "Umidade", unit: "%" },
  { key: "corrente", label: "Corrente", unit: " A" },
];

const chartSeriesColors: Record<ChartMetricKey, string> = {
  temperatura: "#299b8e",
  umidade: "#78bce0",
  corrente: "#d5a93c",
};

function formatMetric(value: number | null | undefined, unit: string) {
  return value === null || value === undefined
    ? "—"
    : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unit}`;
}

function formatTime(time: string | null | undefined) {
  if (!time) {
    return "—";
  }

  const date = new Date(time);
  return Number.isNaN(date.getTime())
    ? time
    : date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function buildChartSeries(
  metric: { key: ChartMetricKey; label: string; unit: string },
  values: (number | null)[],
): ChartSeries {
  const validValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const minimum = validValues.length ? Math.min(...validValues) : 0;
  const maximum = validValues.length ? Math.max(...validValues) : 0;
  const range = maximum - minimum;
  const padding = range === 0 ? Math.max(Math.abs(maximum) * 0.1, 1) : range * 0.12;
  const chartMinimum = minimum - padding;
  const chartRange = maximum - minimum + padding * 2;
  const points = values.map((value, index) => value === null || !Number.isFinite(value)
    ? null
    : {
        x: values.length <= 1 ? 280 : (index / (values.length - 1)) * 560,
        y: 185 - ((value - chartMinimum) / chartRange) * 165,
        value,
        index,
      });

  let path = "";
  let segment: { x: number; y: number }[] = [];
  const appendSegment = () => {
    if (!segment.length) {
      return;
    }

    let segmentPath = `M${segment[0].x.toFixed(1)} ${segment[0].y.toFixed(1)}`;
    for (let index = 1; index < segment.length; index += 1) {
      const previous = segment[index - 1];
      const current = segment[index];
      const midpointX = (previous.x + current.x) / 2;
      const midpointY = (previous.y + current.y) / 2;
      segmentPath += ` Q${previous.x.toFixed(1)} ${previous.y.toFixed(1)} ${midpointX.toFixed(1)} ${midpointY.toFixed(1)}`;
    }
    if (segment.length > 1) {
      const finalPoint = segment[segment.length - 1];
      segmentPath += ` T${finalPoint.x.toFixed(1)} ${finalPoint.y.toFixed(1)}`;
    }
    path += segmentPath;
    segment = [];
  };

  points.forEach((point) => {
    if (point) {
      segment.push(point);
    } else {
      appendSegment();
    }
  });
  appendSegment();

  const lastValue = [...values].reverse().find(
    (value): value is number => value !== null && Number.isFinite(value),
  ) ?? null;

  return {
    ...metric,
    values,
    latestValue: lastValue,
    minimum,
    maximum,
    path,
    points,
    singlePoint: validValues.length === 1 ? points.find((point) => point !== null) ?? null : null,
  };
}

export function DetailDrawer({ equipment, onClose }: Readonly<DetailDrawerProps>) {
  const [period, setPeriod] = useState("24h");
  const [selectedMetric, setSelectedMetric] = useState<ChartMetricKey>("temperatura");
  const [hoveredPoint, setHoveredPoint] = useState<HoveredChartPoint | null>(null);
  const hasSessionRecord = equipment.serial !== undefined;
  const hasSupabaseTelemetry = equipment.telemetry?.readingCount
    ? equipment.telemetry.readingCount > 0
    : false;
  const sourceTelemetry = equipment.telemetry;
  const telemetry = useMemo(() => {
    if (!sourceTelemetry) return null;
    const periodHours = period === "1h" ? 1 : period === "24h" ? 24 : 168;
    const validDates = sourceTelemetry.times
      .map((time) => time ? new Date(time) : null)
      .filter((date): date is Date => date !== null && Number.isFinite(date.getTime()));
    if (!validDates.length) return sourceTelemetry;

    const latest = new Date(Math.max(...validDates.map((date) => date.getTime())));
    const cutoff = latest.getTime() - periodHours * 60 * 60 * 1000;
    const keep = sourceTelemetry.times.map((time) => {
      if (!time) return false;
      const date = new Date(time);
      return Number.isFinite(date.getTime()) && date.getTime() >= cutoff;
    });
    if (keep.every((keepReading) => !keepReading)) return sourceTelemetry;

    const filterValues = (values: (number | null)[]) =>
      values.filter((_, index) => keep[index]);
    const temperatures = filterValues(sourceTelemetry.temperatures);
    const temperaturesSmoothed = filterValues(sourceTelemetry.temperaturesSmoothed);
    const humidities = filterValues(sourceTelemetry.humidities);
    const humiditiesSmoothed = filterValues(sourceTelemetry.humiditiesSmoothed);
    const currents = filterValues(sourceTelemetry.currents);
    const currentsSmoothed = filterValues(sourceTelemetry.currentsSmoothed);
    const times = sourceTelemetry.times.filter((_, index) => keep[index]);
    const average = (values: (number | null)[]) => {
      const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
      return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
    };

    const validCurrents = currents.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

    return {
      ...sourceTelemetry,
      readingCount: times.length,
      times,
      temperatureAverage: average(temperatures),
      humidityAverage: average(humidities),
      currentMaximum: validCurrents.length ? Math.max(...validCurrents) : null,
      temperatures,
      temperaturesSmoothed,
      humidities,
      humiditiesSmoothed,
      currents,
      currentsSmoothed,
    };
  }, [sourceTelemetry, period]);
  const chartSeries = telemetry
    ? [
        buildChartSeries(chartMetrics[0], telemetry.temperaturesSmoothed),
        buildChartSeries(chartMetrics[1], telemetry.humiditiesSmoothed),
        buildChartSeries(chartMetrics[2], telemetry.currentsSmoothed),
      ]
    : [];
  const availableSeries = chartSeries.filter((series) => series.values.some(
    (value) => value !== null && Number.isFinite(value),
  ));
  const activeSeries = availableSeries.find((series) => series.key === selectedMetric)
    ?? availableSeries[0]
    ?? null;
  const activeSeriesPoint = hoveredPoint ? activeSeries?.points[hoveredPoint.index] : null;
  const activeHoveredPoint = hoveredPoint && activeSeriesPoint
    ? { ...activeSeriesPoint, tooltipLeft: hoveredPoint.tooltipLeft, tooltipTop: hoveredPoint.tooltipTop }
    : null;
  const orderedChartSeries = [...chartSeries].sort(
    (left, right) => Number(left.key === activeSeries?.key) - Number(right.key === activeSeries?.key),
  );
  const timeLabels = telemetry && telemetry.times.length > 1
    ? [
        telemetry.times[0],
        telemetry.times[Math.floor((telemetry.times.length - 1) / 2)],
        telemetry.times[telemetry.times.length - 1],
      ]
    : [];
  const healthText = equipment.health === null
    ? "—"
    : equipment.health < 70
      ? "Requer atenção"
      : "Boa condição";
  const healthDetail = equipment.health === null
    ? hasSessionRecord
      ? equipment.analysis
        ? `${equipment.analysis.saude.status_geral} · ${telemetry?.readingCount ?? 0} leituras`
        : `${telemetry?.readingCount ?? 0} leituras · MAC Address ${equipment.macAddress ?? equipment.serial ?? "—"}`
      : "Não há informação de saúde disponível."
    : equipment.analysis
      ? equipment.analysis.saude.status_geral
      : equipment.health < 70
        ? "Queda de 12 pontos nos últimos 30 dias."
        : "Operação estável nos últimos 30 dias.";

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="Fechar detalhes" onClick={onClose} type="button" />
      <aside className="drawer">
        <div className="drawer-header">
          <div>
            <StatusPill status={equipment.status} />
            <h2>{equipment.name}</h2>
            <p>
              {equipment.place}
              {equipment.macAddress ? ` · MAC Address ${equipment.macAddress}` : ""}
              {equipment.voltage ? ` · ${equipment.voltage} V` : ""}
            </p>
          </div>
          <Button variant="ghost" className="icon-button" label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </div>
        <div className="drawer-score">
          <span className="score-ring">
            {equipment.health ?? "—"}
            <small>{equipment.health === null ? "" : "/100"}</small>
          </span>
          <div>
            <small>{hasSupabaseTelemetry ? "RESUMO DAS LEITURAS" : hasSessionRecord ? "RESUMO DO ARQUIVO" : "HEALTH SCORE"}</small>
            <strong>
              {hasSessionRecord
                ? telemetry
                  ? `Temperatura média: ${formatMetric(telemetry.temperatureAverage, " °C")}`
                  : "Aguardando primeira leitura"
                : healthText}
            </strong>
            <p>{healthDetail}</p>
          </div>
        </div>
        <div className="drawer-section-head">
          <div>
            <h3>Telemetria</h3>
            <p>
              {telemetry
                ? `Histórico do sensor · ${telemetry.readingCount} leituras`
                : hasSessionRecord
                  ? "Aguardando dados do equipamento"
                  : "Atualização em tempo real"}
            </p>
          </div>
          <div className="period-tabs">
            {["1h", "24h", "7d"].map((item) => (
              <button
                className={period === item ? "selected" : ""}
                onClick={() => setPeriod(item)}
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {telemetry && (
          <div className="chart-legend" aria-label="Séries do gráfico">
            {chartSeries.map((series) => {
              const hasValues = availableSeries.some((available) => available.key === series.key);
              return (
                <button
                  className={`chart-legend-item chart-series-${series.key}${activeSeries?.key === series.key ? " is-selected" : ""}${hasValues ? "" : " is-unavailable"}`}
                  type="button"
                  key={series.key}
                  aria-pressed={activeSeries?.key === series.key}
                  disabled={!hasValues}
                  onClick={() => {
                    setSelectedMetric(series.key);
                    setHoveredPoint(null);
                  }}
                >
                  <span className="chart-legend-marker" />
                  <span className="chart-legend-copy">
                    <strong>{series.label}</strong>
                    <small>{formatMetric(series.latestValue, series.unit)}</small>
                  </span>
                </button>
              );
            })}
            <span className="chart-legend-note">Escalas independentes</span>
          </div>
        )}
        <div className="detail-chart" onPointerLeave={() => setHoveredPoint(null)}>
          {hasSessionRecord && !telemetry ? (
            <div className="telemetry-empty">
              <strong>Nenhuma telemetria disponível</strong>
              <span>Aguarde o sensor enviar novas leituras para visualizar o histórico.</span>
            </div>
          ) : hasSessionRecord && !availableSeries.length ? (
            <div className="telemetry-empty">
              <strong>Sem leituras numéricas para exibir</strong>
              <span>O dispositivo ainda não enviou valores numéricos de temperatura, umidade ou corrente.</span>
            </div>
          ) : (
            <>
              {telemetry ? (
                activeSeries && (
                  <div className="chart-labels" aria-label={`Escala de ${activeSeries.label}`}>
                    <span>{formatMetric(activeSeries.maximum, activeSeries.unit)}</span>
                    <span>{formatMetric((activeSeries.maximum + activeSeries.minimum) / 2, activeSeries.unit)}</span>
                    <span>{formatMetric(activeSeries.minimum, activeSeries.unit)}</span>
                  </div>
                )
              ) : (
                <div className="chart-labels"><span>-5°</span><span>-10°</span><span>-15°</span><span>-20°</span></div>
              )}
              <svg
                viewBox="0 0 560 210"
                preserveAspectRatio="none"
                role={telemetry ? "img" : undefined}
                aria-label={telemetry ? "Histórico de temperatura, umidade e corrente do sensor" : undefined}
                onPointerMove={(event) => {
                  if (!activeSeries) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const pointerX = ((event.clientX - bounds.left) / bounds.width) * 560;
                  const chartElement = event.currentTarget.parentElement;
                  if (!chartElement) return;
                  const chartBounds = chartElement.getBoundingClientRect();
                  const nearestPoint = activeSeries.points
                    .filter((point): point is ChartPoint => point !== null)
                    .reduce<ChartPoint | null>(
                      (nearest, point) => !nearest || Math.abs(point.x - pointerX) < Math.abs(nearest.x - pointerX)
                        ? point
                        : nearest,
                      null,
                    );
                  if (!nearestPoint) {
                    setHoveredPoint(null);
                    return;
                  }
                  const pointLeft = bounds.left - chartBounds.left + (nearestPoint.x / 560) * bounds.width;
                  const pointTop = bounds.top - chartBounds.top + (nearestPoint.y / 210) * bounds.height;
                  setHoveredPoint({
                    ...nearestPoint,
                    tooltipLeft: Math.max(8, Math.min(pointLeft - 72, chartBounds.width - 152)),
                    tooltipTop: Math.max(8, pointTop - 48),
                  });
                }}
              >
                <defs>
                  <linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity=".2" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="grid-lines" d="M0 20H560M0 75H560M0 130H560M0 185H560" />
                {telemetry ? (
                  orderedChartSeries.map((series) => (
                    <g
                      className={`chart-series-${series.key}${activeSeries?.key === series.key ? " is-highlighted" : " is-dimmed"}`}
                      key={series.key}
                    >
                      <path className="chart-line" d={series.path} />
                      {series.singlePoint && (
                        <circle
                          className="chart-point"
                          cx={series.singlePoint.x}
                          cy={series.singlePoint.y}
                          r="3.5"
                        />
                      )}
                      {activeHoveredPoint && series.key === activeSeries?.key && (
                        <circle
                          className="chart-hover-point"
                          cx={activeHoveredPoint.x}
                          cy={activeHoveredPoint.y}
                          r="5"
                          fill={chartSeriesColors[series.key]}
                        />
                      )}
                    </g>
                  ))
                ) : (
                  <>
                    <path className="threshold" d="M0 58H560" />
                    <path className="chart-fill" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45 L560 210 L0 210Z" />
                    <path className="chart-line" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45" />
                  </>
                )}
              </svg>
              {activeSeries && activeHoveredPoint && telemetry && (
                <div
                  className="chart-hover-tooltip"
                  role="tooltip"
                  style={{ left: activeHoveredPoint.tooltipLeft, top: activeHoveredPoint.tooltipTop }}
                >
                  <strong>{formatMetric(activeHoveredPoint.value, activeSeries.unit)}</strong>
                  <span>{formatTime(telemetry.times[activeHoveredPoint.index])}</span>
                </div>
              )}
              {telemetry ? (
                <div className="chart-times">
                  {timeLabels.map((time, index) => <span key={`${time}-${index}`}>{formatTime(time)}</span>)}
                </div>
              ) : (
                <>
                  <span className="limit-label">Limite máx. −12°</span>
                  <div className="chart-times">
                    <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>Agora</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="drawer-metrics">
          <div>
            <span className="metric-icon"><Icon name={hasSessionRecord ? "drop" : "bolt"} /></span>
            <small>{hasSessionRecord ? "Umidade média" : "Consumo mensal"}</small>
            <strong>{hasSessionRecord ? formatMetric(telemetry?.humidityAverage, "%") : "486,2 kWh"}</strong>
            <p>{hasSessionRecord ? "Média das leituras do sensor" : "+18% vs. mês anterior"}</p>
          </div>
          <div>
            <span className="metric-icon"><Icon name={hasSessionRecord ? "bolt" : "clock"} /></span>
            <small>{hasSessionRecord ? "Corrente máxima" : "Duty cycle"}</small>
            <strong>{hasSessionRecord ? formatMetric(telemetry?.currentMaximum, " A") : "82%"}</strong>
            <p>{hasSessionRecord ? "Maior valor registrado" : "Acima do ideal de 65%"}</p>
          </div>
        </div>
        {equipment.analysis && (
          <div className="drawer-analysis">
            <div className="drawer-section-head">
              <div>
                <h3>Análise avançada</h3>
                <p>
                  {equipment.analysis.termica?.base_temporal === "timestamps"
                    ? "Cálculos ponderados pelos timestamps das leituras"
                    : "Cálculos baseados na sequência de leituras"}
                </p>
              </div>
            </div>
            <div className="drawer-metrics">
              <div>
                <span className="metric-icon"><Icon name="snow" /></span>
                <small>Tempo em risco térmico</small>
                <strong>{formatMetric(equipment.analysis.termica?.percentual_tempo_em_risco, "%")}</strong>
                <p>{equipment.analysis.termica?.falha_preditiva_detectada ? "Tendência de aquecimento" : "Sem alerta preditivo"}</p>
              </div>
              <div>
                <span className="metric-icon"><Icon name="bolt" /></span>
                <small>Duty cycle</small>
                <strong>{formatMetric(equipment.analysis.eletrica?.duty_cycle_percentual, "%")}</strong>
                <p>{formatMetric(equipment.analysis.eletrica?.potencia_estimada_watts, " W")}</p>
              </div>
              <div>
                <span className="metric-icon"><Icon name="clock" /></span>
                <small>Partidas observadas</small>
                <strong>{equipment.analysis.eletrica?.partidas_observadas ?? "—"}</strong>
                <p>Transições desligado → ligado</p>
              </div>
            </div>
            <ul className="analysis-risk-list">
              {equipment.analysis.saude.fatores_de_risco.length ? (
                equipment.analysis.saude.fatores_de_risco.map((factor) => <li key={factor}>{factor}</li>)
              ) : (
                <li>Nenhum fator de risco detectado pelos dados disponíveis.</li>
              )}
            </ul>
          </div>
        )}
        <Button variant="primary" className="full-button">
          Abrir análise completa <Icon name="arrow" />
        </Button>
      </aside>
    </div>
  );
}

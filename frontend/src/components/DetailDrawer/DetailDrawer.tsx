import { useState } from "react";
import type { Equipment } from "../../types/Equipment";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import { StatusPill } from "../StatusPill/StatusPill";

type DetailDrawerProps = {
  equipment: Equipment;
  onClose: () => void;
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

export function DetailDrawer({ equipment, onClose }: Readonly<DetailDrawerProps>) {
  const [period, setPeriod] = useState("24h");
  const hasSessionRecord = equipment.serial !== undefined;
  const telemetry = equipment.telemetry;
  const readings = telemetry?.temperatures.flatMap((temperature, index) =>
    temperature === null
      ? []
      : [{ temperature, time: telemetry.times[index] ?? null }],
  ) ?? [];
  const bucketSize = Math.max(1, Math.ceil(readings.length / 120));
  const chartReadings = Array.from(
    { length: Math.ceil(readings.length / bucketSize) },
    (_, bucketIndex) => {
      const bucket = readings.slice(bucketIndex * bucketSize, (bucketIndex + 1) * bucketSize);
      return {
        temperature: bucket.reduce((sum, reading) => sum + reading.temperature, 0) / bucket.length,
        time: bucket[0].time,
      };
    },
  );
  const chartValues = chartReadings.map((reading) => reading.temperature);
  const rawValues = readings.map((reading) => reading.temperature);
  const dataMinimum = rawValues.length ? Math.min(...rawValues) : 0;
  const dataMaximum = rawValues.length ? Math.max(...rawValues) : 0;
  const dataRange = dataMaximum - dataMinimum;
  const chartPadding = dataRange === 0 ? Math.max(Math.abs(dataMaximum) * 0.1, 1) : dataRange * 0.12;
  const chartMinimum = dataMinimum - chartPadding;
  const chartMaximum = dataMaximum + chartPadding;
  const chartRange = chartMaximum - chartMinimum;
  const chartPoints = chartValues.map((temperature, index) => ({
    x: chartReadings.length === 1 ? 280 : (index / (chartReadings.length - 1)) * 560,
    y: 185 - ((temperature - chartMinimum) / chartRange) * 165,
  }));
  const temperaturePath = chartPoints.reduce((path, point, index) => {
    if (index === 0) {
      return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }

    const previous = chartPoints[index - 1];
    const midpointX = (previous.x + point.x) / 2;
    const midpointY = (previous.y + point.y) / 2;
    return `${path} Q${previous.x.toFixed(1)} ${previous.y.toFixed(1)} ${midpointX.toFixed(1)} ${midpointY.toFixed(1)}`;
  }, "");
  const finalPoint = chartPoints[chartPoints.length - 1];
  const smoothTemperaturePath = finalPoint
    ? `${temperaturePath} T${finalPoint.x.toFixed(1)} ${finalPoint.y.toFixed(1)}`
    : "";
  const temperatureFill = smoothTemperaturePath
    ? `${smoothTemperaturePath} L560 210 L0 210 Z`
    : "";
  const timeLabels = chartReadings.length > 1
    ? [
        chartReadings[0].time,
        chartReadings[Math.floor((chartReadings.length - 1) / 2)].time,
        chartReadings[chartReadings.length - 1].time,
      ]
    : [];
  const healthText = equipment.health === null
    ? "—"
    : equipment.health < 70
      ? "Requer atenção"
      : "Boa condição";
  const healthDetail = equipment.health === null
    ? hasSessionRecord
      ? `${telemetry?.readingCount ?? 0} leituras · Série ${equipment.serial}`
      : "Não há informação de saúde disponível."
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
            <p>{equipment.place}</p>
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
            <small>{hasSessionRecord ? "RESUMO DO ARQUIVO" : "HEALTH SCORE"}</small>
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
                ? `Histórico do JSON · ${telemetry.readingCount} leituras`
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
        <div className="detail-chart">
          {hasSessionRecord && !telemetry ? (
            <div className="telemetry-empty">
              <strong>Nenhuma telemetria disponível</strong>
              <span>Envie um JSON com leituras para visualizar o histórico.</span>
            </div>
          ) : hasSessionRecord && !smoothTemperaturePath ? (
            <div className="telemetry-empty">
              <strong>Sem leituras de temperatura para exibir</strong>
              <span>O arquivo não contém valores numéricos na coluna temperatura.</span>
            </div>
          ) : (
            <>
              {telemetry ? (
                <div className="chart-labels">
                  <span>{formatMetric(chartMaximum, "°")}</span>
                  <span>{formatMetric((chartMaximum + chartMinimum) / 2, "°")}</span>
                  <span>{formatMetric(chartMinimum, "°")}</span>
                </div>
              ) : (
                <div className="chart-labels"><span>-5°</span><span>-10°</span><span>-15°</span><span>-20°</span></div>
              )}
              <svg
                viewBox="0 0 560 210"
                preserveAspectRatio="none"
                role={telemetry ? "img" : undefined}
                aria-label={telemetry ? "Histórico de temperatura do arquivo JSON" : undefined}
              >
                <defs>
                  <linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity=".2" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="grid-lines" d="M0 20H560M0 75H560M0 130H560M0 185H560" />
                {telemetry ? (
                  <>
                    <path className="chart-fill" d={temperatureFill} />
                    <path className="chart-line" d={smoothTemperaturePath} />
                  </>
                ) : (
                  <>
                    <path className="threshold" d="M0 58H560" />
                    <path className="chart-fill" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45 L560 210 L0 210Z" />
                    <path className="chart-line" d="M0 150 C45 155 72 130 110 142 S175 155 215 128 290 141 327 108 390 124 425 80 500 93 560 45" />
                  </>
                )}
              </svg>
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
            <p>{hasSessionRecord ? "Média das leituras do JSON" : "+18% vs. mês anterior"}</p>
          </div>
          <div>
            <span className="metric-icon"><Icon name={hasSessionRecord ? "bolt" : "clock"} /></span>
            <small>{hasSessionRecord ? "Corrente máxima" : "Duty cycle"}</small>
            <strong>{hasSessionRecord ? formatMetric(telemetry?.currentMaximum, " A") : "82%"}</strong>
            <p>{hasSessionRecord ? "Maior valor do arquivo" : "Acima do ideal de 65%"}</p>
          </div>
        </div>
        <Button variant="primary" className="full-button">
          Abrir análise completa <Icon name="arrow" />
        </Button>
      </aside>
    </div>
  );
}

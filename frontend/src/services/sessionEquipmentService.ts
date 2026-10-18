import type { AdvancedAnalysis, Equipment } from "../types/Equipment";

const apiUrl = "http://localhost:8000";
const sessionIdKey = "cold-chain-session-id";
const equipmentStorageKey = "equipamentos";

type TelemetryAnalysisResponse = {
  resumo_analise: {
    temperatura_media: number | null;
    umidade_media?: number | null;
    corrente_maxima: number | null;
    total_leituras: number;
  };
  dados_graficos: {
    tempos: (string | null)[];
    temperaturas: (number | null)[];
    temperaturas_suavizadas: (number | null)[];
    umidades: (number | null)[];
    umidades_suavizadas: (number | null)[];
    correntes: (number | null)[];
    correntes_suavizadas: (number | null)[];
  };
};

export type SessionDashboardSummary = {
  total_equipamentos: number;
  total_leituras: number;
  analises_concluidas: number;
  alertas: number;
  temperatura_media: number | null;
};

export type SessionEquipmentRecord = {
  nome: string;
  serial: string;
  setor?: string;
  telemetria: TelemetryAnalysisResponse | null;
  analise_avancada?: AdvancedAnalysis | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTelemetryAnalysis(value: unknown): value is TelemetryAnalysisResponse {
  if (!isRecord(value) || !isRecord(value.resumo_analise) || !isRecord(value.dados_graficos)) {
    return false;
  }

  const summary = value.resumo_analise;
  const chart = value.dados_graficos;
  return (
    isNumberOrNull(summary.temperatura_media) &&
    (summary.umidade_media === undefined || isNumberOrNull(summary.umidade_media)) &&
    isNumberOrNull(summary.corrente_maxima) &&
    typeof summary.total_leituras === "number" &&
    Array.isArray(chart.tempos) &&
    chart.tempos.every((time) => typeof time === "string" || time === null) &&
    Array.isArray(chart.temperaturas) &&
    chart.temperaturas.every(isNumberOrNull) &&
    Array.isArray(chart.temperaturas_suavizadas) &&
    chart.temperaturas_suavizadas.every(isNumberOrNull) &&
    Array.isArray(chart.umidades) &&
    chart.umidades.every(isNumberOrNull) &&
    Array.isArray(chart.umidades_suavizadas) &&
    chart.umidades_suavizadas.every(isNumberOrNull) &&
    Array.isArray(chart.correntes) &&
    chart.correntes.every(isNumberOrNull) &&
    Array.isArray(chart.correntes_suavizadas) &&
    chart.correntes_suavizadas.every(isNumberOrNull) &&
    chart.tempos.length === chart.temperaturas.length &&
    chart.tempos.length === chart.temperaturas_suavizadas.length &&
    chart.tempos.length === chart.umidades.length &&
    chart.tempos.length === chart.umidades_suavizadas.length &&
    chart.tempos.length === chart.correntes.length &&
    chart.tempos.length === chart.correntes_suavizadas.length
  );
}

function isSessionEquipmentRecord(value: unknown): value is SessionEquipmentRecord {
  return (
    isRecord(value) &&
    typeof value.nome === "string" &&
    typeof value.serial === "string" &&
    (value.setor === undefined || typeof value.setor === "string") &&
    (value.telemetria === null || isTelemetryAnalysis(value.telemetria)) &&
    (value.analise_avancada === undefined ||
      value.analise_avancada === null ||
      isAdvancedAnalysis(value.analise_avancada))
  );
}

function isAdvancedAnalysis(value: unknown): value is AdvancedAnalysis {
  if (!isRecord(value) || !isRecord(value.saude)) {
    return false;
  }

  const validReport = (report: unknown, numericFields: string[], booleanFields: string[]) =>
    report === null ||
    (isRecord(report) &&
      numericFields.every((field) => isFiniteNumber(report[field])) &&
      booleanFields.every((field) => typeof report[field] === "boolean"));
  const health = value.saude;

  return (
    validReport(
      value.termica,
      [
        "setpoint_aprendido",
        "oscilacao_natural_iqr",
        "limite_critico_calculado",
        "percentual_tempo_em_risco",
        "tendencia_aquecimento_graus",
      ],
      ["falha_preditiva_detectada"],
    ) &&
    (value.termica === null ||
      (isRecord(value.termica) &&
        (value.termica.base_temporal === "timestamps" || value.termica.base_temporal === "leituras"))) &&
    validReport(
      value.eletrica,
      [
        "corrente_pico_partida",
        "corrente_trabalho_media",
        "duty_cycle_percentual",
        "potencia_estimada_watts",
        "partidas_observadas",
      ],
      ["alerta_esforco_critico", "alerta_compressor_travando"],
    ) &&
    isNumberOrNull(health.health_score) &&
    typeof health.status_geral === "string" &&
    Array.isArray(health.fatores_de_risco) &&
    health.fatores_de_risco.every((factor) => typeof factor === "string")
  );
}

export function parseSessionEquipmentList(value: unknown): SessionEquipmentRecord[] {
  if (
    !isRecord(value) ||
    !Array.isArray(value.equipamentos) ||
    !value.equipamentos.every(isSessionEquipmentRecord)
  ) {
    throw new Error("O servidor retornou uma lista de equipamentos inválida.");
  }

  return value.equipamentos;
}

export function getSessionId(): string {
  const existingId = sessionStorage.getItem(sessionIdKey);
  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  sessionStorage.setItem(sessionIdKey, newId);
  return newId;
}

export async function fetchSessionEquipments(): Promise<SessionEquipmentRecord[]> {
  const response = await fetch(`${apiUrl}/equipamentos`, {
    headers: { "X-Session-ID": getSessionId() },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar os equipamentos (erro ${response.status}).`);
  }

  const records = parseSessionEquipmentList(await response.json());
  sessionStorage.setItem(equipmentStorageKey, JSON.stringify(records));
  return records;
}

export async function fetchSessionDashboardSummary(): Promise<SessionDashboardSummary> {
  const response = await fetch(`${apiUrl}/resumo`, {
    headers: { "X-Session-ID": getSessionId() },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar o resumo da sessão (erro ${response.status}).`);
  }

  const body: unknown = await response.json();
  if (!isRecord(body) || !isRecord(body.resumo)) {
    throw new Error("O servidor retornou um resumo de sessão inválido.");
  }

  const summary = body.resumo;
  if (
    !isFiniteNumber(summary.total_equipamentos) ||
    !isFiniteNumber(summary.total_leituras) ||
    !isFiniteNumber(summary.analises_concluidas) ||
    !isFiniteNumber(summary.alertas) ||
    !isNumberOrNull(summary.temperatura_media)
  ) {
    throw new Error("O servidor retornou métricas de sessão inválidas.");
  }

  return {
    total_equipamentos: summary.total_equipamentos,
    total_leituras: summary.total_leituras,
    analises_concluidas: summary.analises_concluidas,
    alertas: summary.alertas,
    temperatura_media: summary.temperatura_media,
  };
}

export async function analyzeSessionEquipment(serial: string): Promise<SessionEquipmentRecord[]> {
  const response = await fetch(`${apiUrl}/analise-avancada`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": getSessionId(),
    },
    body: JSON.stringify({ serial }),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível analisar o equipamento (erro ${response.status}).`);
  }

  const records = parseSessionEquipmentList(await response.json());
  sessionStorage.setItem(equipmentStorageKey, JSON.stringify(records));
  return records;
}

export function toEquipment(record: SessionEquipmentRecord, index: number): Equipment {
  const telemetry = record.telemetria;
  const temperatureAverage = telemetry?.resumo_analise.temperatura_media ?? null;
  const humidityAverage = telemetry?.resumo_analise.umidade_media ?? null;
  const currentMaximum = telemetry?.resumo_analise.corrente_maxima ?? null;
  const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const healthStatus = record.analise_avancada?.saude.status_geral;
  const status = healthStatus === "Crítico"
    ? "critical"
    : healthStatus === "Atenção"
      ? "warning"
      : healthStatus === "Saudável"
        ? "normal"
        : telemetry
          ? "historical"
          : "registered";

  return {
    id: `session-${record.serial.toLowerCase()}-${index}`,
    name: record.nome,
    place: `${record.setor ?? "Sem setor"} · Série ${record.serial}`,
    temp: temperatureAverage === null ? "—" : `${format.format(temperatureAverage)} °C`,
    humidity: humidityAverage === null ? "—" : `${format.format(humidityAverage)}%`,
    current: currentMaximum === null ? "—" : `${format.format(currentMaximum)} A`,
    health: record.analise_avancada?.saude.health_score ?? null,
    cost: "—",
    status,
    trend: record.analise_avancada?.termica?.falha_preditiva_detectada ? "rising" : "stable",
    points: "",
    serial: record.serial,
    analysis: record.analise_avancada ?? null,
    temperatureLabel: telemetry ? "Temperatura média" : "Temperatura agora",
    humidityLabel: telemetry ? "Umidade média" : "Umidade",
    currentLabel: telemetry ? "Corrente máx." : "Corrente",
    trendMessage: telemetry
      ? `${telemetry.resumo_analise.total_leituras} leituras no arquivo`
      : "Aguardando primeira leitura",
    telemetry: telemetry
      ? {
          temperatureAverage,
          humidityAverage,
          currentMaximum,
          readingCount: telemetry.resumo_analise.total_leituras,
          times: telemetry.dados_graficos.tempos,
          temperatures: telemetry.dados_graficos.temperaturas,
          temperaturesSmoothed: telemetry.dados_graficos.temperaturas_suavizadas,
          humidities: telemetry.dados_graficos.umidades ?? [],
          humiditiesSmoothed: telemetry.dados_graficos.umidades_suavizadas,
          currents: telemetry.dados_graficos.correntes,
          currentsSmoothed: telemetry.dados_graficos.correntes_suavizadas,
        }
      : null,
  };
}

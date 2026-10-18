import type { Equipment } from "../types/Equipment";

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
    umidades?: (number | null)[];
    correntes: (number | null)[];
  };
};

export type SessionEquipmentRecord = {
  nome: string;
  serial: string;
  setor?: string;
  telemetria: TelemetryAnalysisResponse | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
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
    (chart.umidades === undefined ||
      (Array.isArray(chart.umidades) && chart.umidades.every(isNumberOrNull))) &&
    Array.isArray(chart.correntes) &&
    chart.correntes.every(isNumberOrNull)
  );
}

function isSessionEquipmentRecord(value: unknown): value is SessionEquipmentRecord {
  return (
    isRecord(value) &&
    typeof value.nome === "string" &&
    typeof value.serial === "string" &&
    (value.setor === undefined || typeof value.setor === "string") &&
    (value.telemetria === null || isTelemetryAnalysis(value.telemetria))
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

export function toEquipment(record: SessionEquipmentRecord, index: number): Equipment {
  const telemetry = record.telemetria;
  const temperatureAverage = telemetry?.resumo_analise.temperatura_media ?? null;
  const humidityAverage = telemetry?.resumo_analise.umidade_media ?? null;
  const currentMaximum = telemetry?.resumo_analise.corrente_maxima ?? null;
  const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

  return {
    id: `session-${record.serial.toLowerCase()}-${index}`,
    name: record.nome,
    place: `${record.setor ?? "Sem setor"} · Série ${record.serial}`,
    temp: temperatureAverage === null ? "—" : `${format.format(temperatureAverage)} °C`,
    humidity: humidityAverage === null ? "—" : `${format.format(humidityAverage)}%`,
    current: currentMaximum === null ? "—" : `${format.format(currentMaximum)} A`,
    health: null,
    cost: "—",
    status: telemetry ? "historical" : "registered",
    trend: "stable",
    points: "",
    serial: record.serial,
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
          humidities: telemetry.dados_graficos.umidades ?? [],
          currents: telemetry.dados_graficos.correntes,
        }
      : null,
  };
}

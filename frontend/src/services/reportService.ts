import {
  fetchSessionReportData,
  type SessionReportEquipmentRecord,
  type SessionScope,
} from "./sessionEquipmentService";
import type { SessionEquipmentRecord } from "./sessionEquipmentService";
import type { SessionMode } from "./sessionEquipmentService";
import type { Alert } from "../types/Alert";
import { getSessionAlerts, readAcknowledgedAlertIds } from "./sessionAlertService";

export type ReportKind = "consolidated" | "management" | "alerts" | "energy" | "telemetry";

export type ReportExportContext = {
  mode: SessionMode;
  equipments: SessionEquipmentRecord[];
  accountAlerts: Alert[];
};

export const energyTariffStorageKey = "cold-chain-energy-tariff";

type ReportReading = {
  equipment: SessionReportEquipmentRecord;
  data: Record<string, unknown>;
};

type FilteredReportData = {
  readings: ReportReading[];
  excludedWithoutTimestamp: number;
};

export function getReportMonthOptions(now = new Date()): [string, string] {
  function formatMonth(monthOffset: number): string {
    const month = new Date(Date.UTC(now.getFullYear(), now.getMonth() - monthOffset, 1));
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" })
      .format(month);
    return `${label[0].toLocaleUpperCase("pt-BR")}${label.slice(1)} de ${month.getUTCFullYear()}`;
  }

  return [formatMonth(0), formatMonth(1)];
}

function readEnergyTariff(): number {
  try {
    const storedValue = localStorage.getItem(energyTariffStorageKey);
    if (storedValue === null) return 0.85;
    const tariff = Number(storedValue);
    return Number.isFinite(tariff) && tariff >= 0 ? tariff : 0.85;
  } catch (error) {
    console.error("Não foi possível ler a tarifa de energia salva:", error);
    return 0.85;
  }
}

const monthNumbers: Record<string, number> = {
  Janeiro: 0,
  Fevereiro: 1,
  Março: 2,
  Abril: 3,
  Maio: 4,
  Junho: 5,
  Julho: 6,
  Agosto: 7,
  Setembro: 8,
  Outubro: 9,
  Novembro: 10,
  Dezembro: 11,
};

function getReadingDate(reading: Record<string, unknown>): Date | null {
  if (typeof reading.timestamp !== "string") return null;
  const parsed = new Date(reading.timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function filterReportData(
  equipments: SessionReportEquipmentRecord[],
  period: string,
  now = new Date(),
): FilteredReportData {
  const readings: ReportReading[] = [];
  let excludedWithoutTimestamp = 0;
  const monthMatch = /^([A-Za-zÀ-ÿ]+) de (\d{4})$/.exec(period);
  const selectedMonth = monthMatch ? monthNumbers[monthMatch[1]] : undefined;
  const selectedYear = monthMatch ? Number(monthMatch[2]) : undefined;
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  for (const equipment of equipments) {
    for (const data of equipment.leituras) {
      if (period === "Período personalizado") {
        readings.push({ equipment, data });
        continue;
      }

      const timestamp = getReadingDate(data);
      if (!timestamp) {
        excludedWithoutTimestamp += 1;
        continue;
      }

      if (
        monthMatch &&
        selectedMonth !== undefined &&
        timestamp.getMonth() === selectedMonth &&
        timestamp.getFullYear() === selectedYear
      ) {
        readings.push({ equipment, data });
      } else if (period === "Últimos 7 dias" && timestamp.getTime() >= sevenDaysAgo && timestamp <= now) {
        readings.push({ equipment, data });
      } else if (!monthMatch && period !== "Últimos 7 dias") {
        readings.push({ equipment, data });
      }
    }
  }

  return { readings, excludedWithoutTimestamp };
}

function getNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null, digits = 1): string {
  return value === null
    ? "Não disponível"
    : value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function average(values: (number | null)[]): number | null {
  const available = values.filter((value): value is number => value !== null);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

function maximum(values: number[]): number | null {
  return values.length ? values.reduce((highest, value) => Math.max(highest, value), -Infinity) : null;
}

function estimateEnergyKwh(readings: Record<string, unknown>[]): number | null {
  const samples = readings
    .map((reading) => ({
      timestamp: getReadingDate(reading)?.getTime() ?? null,
      current: getNumber(reading.corrente),
    }))
    .filter((sample): sample is { timestamp: number; current: number } =>
      sample.timestamp !== null && sample.current !== null && sample.current >= 0
    )
    .sort((left, right) => left.timestamp - right.timestamp);

  if (samples.length < 2) return null;

  let wattHours = 0;
  let validIntervals = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const durationHours = (current.timestamp - previous.timestamp) / 3_600_000;
    if (durationHours <= 0) continue;

    const previousWatts = previous.current * 220 * 0.85;
    const currentWatts = current.current * 220 * 0.85;
    wattHours += ((previousWatts + currentWatts) / 2) * durationHours;
    validIntervals += 1;
  }

  return validIntervals ? wattHours / 1000 : null;
}

function getEquipmentReadings(
  equipment: SessionReportEquipmentRecord,
  readings: ReportReading[],
): Record<string, unknown>[] {
  return readings.filter((reading) => reading.equipment.serial === equipment.serial).map(({ data }) => data);
}

function addCommonPdfLines(
  lines: string[],
  title: string,
  period: string,
  equipments: SessionReportEquipmentRecord[],
  filtered: FilteredReportData,
): void {
  lines.push(
    "Relatório Cold Ghost",
    title,
    `Período selecionado: ${period}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    `Equipamentos cadastrados nesta sessão: ${equipments.length}`,
    `Leituras incluídas no período: ${filtered.readings.length}`,
  );

  if (filtered.excludedWithoutTimestamp) {
    lines.push(
      `Leituras sem timestamp válido excluídas do filtro de data: ${filtered.excludedWithoutTimestamp}`,
    );
  }
  if (filtered.readings.length === 0) {
    lines.push("Nenhuma leitura foi encontrada para o período selecionado; indicadores calculados das leituras ficarão indisponíveis.");
  }
  if (period === "Período personalizado") {
    lines.push("Filtro personalizado sem datas configuradas: foram incluídas todas as leituras da sessão.");
  }
  lines.push("");
}

function getManagementLines(
  equipments: SessionReportEquipmentRecord[],
  filtered: FilteredReportData,
): string[] {
  const temperatures = filtered.readings.map(({ data }) => getNumber(data.temperatura));
  const humidities = filtered.readings.map(({ data }) => getNumber(data.umidade));
  const currents = filtered.readings.map(({ data }) => getNumber(data.corrente)).filter(
    (value): value is number => value !== null,
  );
  const healthScores = equipments
    .map((equipment) => equipment.analise_avancada?.saude.health_score ?? null)
    .filter((value): value is number => value !== null);
  const energyByEquipment = equipments.map((equipment) => ({
    equipment,
    kwh: estimateEnergyKwh(getEquipmentReadings(equipment, filtered.readings)),
  }));
  const totalEnergyKwh = energyByEquipment.reduce(
    (total, item) => total + (item.kwh ?? 0),
    0,
  );
  const energyAvailable = energyByEquipment.some((item) => item.kwh !== null);
  const tariff = readEnergyTariff();
  const alerts = getSessionAlerts(equipments);
  const criticalAlerts = alerts.filter((alert) => alert.level === "critical").length;
  const alertsBySerial = new Map<string, number>();
  for (const alert of alerts) {
    alertsBySerial.set(
      alert.equipmentSerial,
      (alertsBySerial.get(alert.equipmentSerial) ?? 0) + 1,
    );
  }

  const lines = [
    "Resumo operacional",
    "As leituras ambientais respeitam o período selecionado; análises avançadas consideram o histórico disponível.",
    "Consumo elétrico fica indisponível até o sensor fornecer valores válidos de corrente.",
    `Equipamentos cadastrados: ${equipments.length} · com telemetria: ${equipments.filter((equipment) => equipment.leituras.length > 0).length} · com análise de saúde: ${healthScores.length}`,
    `Total de leituras: ${filtered.readings.length}`,
    `Alertas calculados: ${alerts.length} · críticos: ${criticalAlerts} · atenção: ${alerts.length - criticalAlerts}`,
    `Temperatura média: ${formatNumber(average(temperatures), 2)} °C`,
    `Umidade média: ${formatNumber(average(humidities), 2)} %`,
    `Corrente máxima: ${formatNumber(maximum(currents), 2)} A`,
    `Health Score médio disponível: ${formatNumber(average(healthScores), 1)}`,
    `Consumo estimado total: ${energyAvailable ? formatNumber(totalEnergyKwh, 3) : "Não disponível"} kWh`,
    `Custo estimado à tarifa configurada de R$ ${formatNumber(tariff, 2)}/kWh: ${energyAvailable ? `R$ ${formatNumber(totalEnergyKwh * tariff, 2)}` : "Não disponível"}`,
    "",
    "Equipamentos",
  ];

  for (const equipment of equipments) {
    const equipmentReadings = getEquipmentReadings(equipment, filtered.readings);
    const equipmentTemperatures = equipmentReadings.map((reading) => getNumber(reading.temperatura));
    const equipmentHumidities = equipmentReadings.map((reading) => getNumber(reading.umidade));
    const equipmentCurrents = equipmentReadings
      .map((reading) => getNumber(reading.corrente))
      .filter((value): value is number => value !== null);
    const equipmentEnergyKwh = estimateEnergyKwh(equipmentReadings);
    lines.push(
      `${equipment.nome} (MAC Address ${equipment.serial})`,
      `Setor: ${equipment.setor || "Não informado"} · Leituras: ${equipmentReadings.length}`,
      `Temperatura média: ${formatNumber(average(equipmentTemperatures), 2)} °C · Umidade média: ${formatNumber(average(equipmentHumidities), 2)} %`,
      `Corrente máxima: ${formatNumber(maximum(equipmentCurrents), 2)} A · Alertas: ${alertsBySerial.get(equipment.serial) ?? 0}`,
      `Health Score: ${formatNumber(equipment.analise_avancada?.saude.health_score ?? null)} · Status: ${equipment.analise_avancada?.saude.status_geral ?? "Análise indisponível"}`,
      `Consumo estimado: ${equipmentEnergyKwh === null ? "Não disponível" : `${formatNumber(equipmentEnergyKwh, 3)} kWh`} · Custo: ${equipmentEnergyKwh === null ? "Não disponível" : `R$ ${formatNumber(equipmentEnergyKwh * tariff, 2)}`}`,
      "",
    );
  }

  return lines;
}

function getAlertLines(
  equipments: SessionReportEquipmentRecord[],
  scope: SessionScope,
  accountAlerts: Alert[] = [],
): string[] {
  const acknowledgedIds = new Set(readAcknowledgedAlertIds(scope));
  const sessionAlerts = getSessionAlerts(equipments);
  const alerts = [
    ...sessionAlerts,
    ...accountAlerts.map((alert) => ({
      level: alert.level,
      title: alert.title,
      equipmentName: alert.equipmentName,
      equipmentSerial: alert.equipmentSerial,
      detail: alert.detail,
      id: alert.id,
    })),
  ];
  const lines = [
    "Auditoria de alertas",
    "Os alertas refletem as leituras e os limites disponíveis no período atual.",
    "Identidade do usuário não registrada; reconhecimentos são locais nesta aba, sem log imutável.",
    `Alertas encontrados: ${alerts.length}`,
    "",
  ];

  if (!alerts.length) {
    lines.push("Nenhum alerta foi encontrado nas análises disponíveis.");
  }

  for (const alert of alerts) {
    const accountAlert = accountAlerts.find((item) => item.id === alert.id);
    const acknowledged = accountAlert
      ? accountAlert.state === "Reconhecido"
      : acknowledgedIds.has(alert.id);
    lines.push(
      `${alert.level === "critical" ? "Crítico" : "Atenção"} · ${alert.title}`,
      `Equipamento: ${alert.equipmentName} (MAC Address ${alert.equipmentSerial})`,
      `Detalhe: ${alert.detail}`,
      `Reconhecimento: ${acknowledged ? "Sim" : "Não"}`,
      "",
    );
  }
  return lines;
}

function getEnergyLines(
  equipments: SessionReportEquipmentRecord[],
  filtered: FilteredReportData,
): string[] {
  const lines = [
    "Indicadores disponíveis",
    "Os indicadores elétricos dependem de leituras de corrente válidas.",
    "Enquanto não houver corrente, consumo, custo e duty cycle ficam indisponíveis.",
    `Tarifa aplicada: R$ ${formatNumber(readEnergyTariff(), 2)}/kWh.`,
    "",
  ];
  const ranked = equipments
    .map((equipment) => {
      const readings = getEquipmentReadings(equipment, filtered.readings);
      return { equipment, energyKwh: estimateEnergyKwh(readings) };
    })
    .sort((left, right) => (right.energyKwh ?? -1) - (left.energyKwh ?? -1));

  if (!ranked.length || ranked.every(({ energyKwh }) => energyKwh === null)) {
    lines.push("Não há leituras com corrente e timestamps válidos suficientes para estimar o consumo.");
    return lines;
  }

  ranked.forEach(({ equipment, energyKwh }, index) => {
    const electrical = equipment.analise_avancada?.eletrica;
    lines.push(
      `${index + 1}. ${equipment.nome} (MAC Address ${equipment.serial})`,
      `Consumo estimado no período: ${energyKwh === null ? "Não disponível" : `${formatNumber(energyKwh, 3)} kWh`} · Custo: ${energyKwh === null ? "Não disponível" : `R$ ${formatNumber(energyKwh * readEnergyTariff(), 2)}`}`,
      `Duty cycle: ${formatNumber(electrical?.duty_cycle_percentual ?? null)} % · Potência estimada: ${formatNumber(electrical?.potencia_estimada_watts ?? null)} W`,
      `Corrente de trabalho média: ${formatNumber(electrical?.corrente_trabalho_media ?? null)} A · Partidas: ${electrical?.partidas_observadas ?? "Não disponível"}`,
      "",
    );
  });
  return lines;
}

async function createAndDownloadPdf(filename: string, lines: string[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageHeight = document.internal.pageSize.getHeight();
  let y = margin;

  lines.forEach((line, index) => {
    const isTitle = index === 0;
    document.setFont("helvetica", isTitle ? "bold" : "normal");
    document.setFontSize(isTitle ? 16 : 10);
    const wrappedLines = document.splitTextToSize(line || " ", document.internal.pageSize.getWidth() - margin * 2);
    const lineHeight = isTitle ? 8 : 5;

    for (const wrappedLine of wrappedLines) {
      if (y + lineHeight > pageHeight - margin) {
        document.addPage();
        y = margin;
      }
      document.text(wrappedLine, margin, y);
      y += lineHeight;
    }
  });

  document.save(filename);
}

function escapeCsv(value: unknown): string {
  let serialized = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/^[\t\r ]*[=+\-@]/.test(serialized)) serialized = `'${serialized}`;
  return `"${serialized.replace(/"/g, '""')}"`;
}

function downloadTelemetryCsv(filtered: FilteredReportData): void {
  const columns = [...new Set(filtered.readings.flatMap(({ data }) => Object.keys(data)))];
  const headers = ["equipamento_nome", "numero_serie", "setor", ...columns];
  const rows = filtered.readings.map(({ equipment, data }) =>
    [
      equipment.nome,
      equipment.serial,
      equipment.setor ?? "",
      ...columns.map((column) => data[column]),
    ].map(escapeCsv).join(",")
  );
  const content = `\uFEFF${[headers.map(escapeCsv).join(","), ...rows].join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "dados-brutos-de-telemetria.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeFilename(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function exportReport(
  name: string,
  period: string,
  kind: ReportKind,
  scope: SessionScope = "demo",
  context?: ReportExportContext,
): Promise<void> {
  let equipments: SessionReportEquipmentRecord[];
  if (context?.mode === "account") {
    equipments = context.equipments.map((equipment) => {
      const chart = equipment.telemetria?.dados_graficos;
      const times = chart?.tempos ?? [];
      const temperatures = chart?.temperaturas ?? [];
      const humidities = chart?.umidades ?? [];
      const currents = chart?.correntes ?? [];
      const count = Math.max(times.length, temperatures.length, humidities.length, currents.length);
      const leituras = Array.from({ length: count }, (_, index) => ({
        timestamp: times[index] ?? null,
        temperatura: temperatures[index] ?? null,
        umidade: humidities[index] ?? null,
        corrente: currents[index] ?? null,
      })).filter((reading) =>
        reading.timestamp !== null ||
        reading.temperatura !== null ||
        reading.umidade !== null ||
        reading.corrente !== null,
      );
      return {
        ...equipment,
        leituras,
      };
    });
  } else {
    equipments = await fetchSessionReportData(scope);
  }
  const filtered = filterReportData(equipments, period);

  if (kind === "telemetry") {
    downloadTelemetryCsv(filtered);
    return;
  }

  const lines: string[] = [];
  addCommonPdfLines(lines, name, period, equipments, filtered);
  if (kind === "management" || kind === "consolidated") {
    lines.push(...getManagementLines(equipments, filtered));
  }
  if (kind === "alerts" || kind === "consolidated") {
    lines.push(...getAlertLines(equipments, scope, context?.accountAlerts));
  }
  if (kind === "energy" || kind === "consolidated") {
    lines.push(...getEnergyLines(equipments, filtered));
  }

  await createAndDownloadPdf(`${sanitizeFilename(name) || "relatorio"}.pdf`, lines);
}

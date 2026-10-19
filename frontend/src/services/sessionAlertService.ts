import type { Alert } from "../types/Alert";
import type { SessionEquipmentRecord } from "./sessionEquipmentService";

export const acknowledgedAlertsKey = "cold-chain-acknowledged-alerts";

export function readAcknowledgedAlertIds(): string[] {
  try {
    const storedIds = sessionStorage.getItem(acknowledgedAlertsKey);
    if (!storedIds) return [];
    const parsedIds: unknown = JSON.parse(storedIds);
    if (!Array.isArray(parsedIds) || !parsedIds.every((id) => typeof id === "string")) {
      throw new Error("A lista de avisos reconhecidos está em formato inválido.");
    }
    return parsedIds;
  } catch (error) {
    console.error("Não foi possível ler os avisos reconhecidos nesta sessão:", error);
    return [];
  }
}

export function saveAcknowledgedAlertIds(ids: string[]): boolean {
  try {
    sessionStorage.setItem(acknowledgedAlertsKey, JSON.stringify(ids));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar o reconhecimento dos avisos:", error);
    return false;
  }
}

function formatNumber(value: number, fractionDigits = 1): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: fractionDigits });
}

function formatTimestamp(values: (string | null)[]): string {
  const latestTimestamp = values
    .map((value) => value ? new Date(value) : null)
    .filter((date): date is Date => date !== null && Number.isFinite(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];
  if (!latestTimestamp) return "Horário não informado no JSON";
  return `Leitura mais recente: ${latestTimestamp.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function getSessionAlerts(equipments: SessionEquipmentRecord[]): Alert[] {
  return equipments.flatMap((equipment) => {
    const analysis = equipment.analise_avancada;
    if (!analysis) return [];

    const time = formatTimestamp(equipment.telemetria?.dados_graficos.tempos ?? []);
    if (analysis.avisos) {
      return analysis.avisos.map((warning) => ({
        id: `${equipment.serial}:${warning.codigo}`,
        level: warning.nivel,
        title: warning.titulo,
        equipmentName: equipment.nome,
        equipmentSerial: equipment.serial,
        detail: warning.detalhe,
        value: warning.valor,
        time,
        state: "Pendente",
        icon: warning.codigo.startsWith("temperatura") ||
          warning.codigo === "risco_termico" ||
          warning.codigo === "tendencia_aquecimento"
          ? "thermometer"
          : warning.codigo.includes("telemetria") ||
              warning.codigo.includes("timestamp") ||
              warning.codigo.startsWith("qualidade")
            ? "clock"
            : "bolt",
      }));
    }

    const alerts: Alert[] = [];
    const thermal = analysis.termica;
    if (
      thermal &&
      (thermal.falha_preditiva_detectada || thermal.percentual_tempo_em_risco > 2)
    ) {
      const critical = thermal.percentual_tempo_em_risco > 10;
      const reasons = [
        thermal.percentual_tempo_em_risco > 2
          ? `${formatNumber(thermal.percentual_tempo_em_risco)}% do período em risco térmico`
          : "",
        thermal.falha_preditiva_detectada ? "tendência preditiva de aquecimento detectada" : "",
      ].filter(Boolean);
      alerts.push({
        id: `${equipment.serial}:termico`,
        level: critical ? "critical" : "warning",
        title: critical ? "Exposição térmica crítica" : "Atenção térmica",
        equipmentName: equipment.nome,
        equipmentSerial: equipment.serial,
        detail: reasons.join(" · "),
        value: `${formatNumber(thermal.percentual_tempo_em_risco)}% em risco`,
        time,
        state: "Pendente",
        icon: "thermometer",
      });
    }

    const electrical = analysis.eletrica;
    if (
      electrical &&
      (
        electrical.alerta_esforco_critico ||
        electrical.alerta_compressor_travando ||
        electrical.duty_cycle_percentual < 10
      )
    ) {
      const reasons = [
        electrical.alerta_esforco_critico ? "Duty cycle acima de 75%" : "",
        electrical.alerta_compressor_travando ? "possível compressor travando" : "",
        electrical.duty_cycle_percentual < 10 ? "Duty cycle abaixo de 10%: verificar subutilização ou sensor" : "",
      ].filter(Boolean);
      alerts.push({
        id: `${equipment.serial}:eletrico`,
        level: electrical.alerta_compressor_travando ? "critical" : "warning",
        title: electrical.alerta_compressor_travando
          ? "Possível falha no compressor"
          : electrical.alerta_esforco_critico
            ? "Esforço elétrico elevado"
            : "Duty cycle muito baixo",
        equipmentName: equipment.nome,
        equipmentSerial: equipment.serial,
        detail: reasons.join(" · "),
        value: `Duty cycle ${formatNumber(electrical.duty_cycle_percentual)}% · pico ${formatNumber(electrical.corrente_pico_partida)} A`,
        time,
        state: "Pendente",
        icon: "bolt",
      });
    }
    return alerts;
  });
}

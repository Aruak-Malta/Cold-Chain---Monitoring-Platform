export type EquipmentStatus = "normal" | "critical" | "warning" | "offline" | "historical" | "registered";
export type EquipmentTrend = "stable" | "rising" | "offline";

export type AdvancedAnalysis = {
  termica: {
    setpoint_aprendido: number;
    oscilacao_natural_iqr: number;
    limite_critico_calculado: number;
    percentual_tempo_em_risco: number;
    tendencia_aquecimento_graus: number;
    base_temporal: "timestamps" | "leituras";
    falha_preditiva_detectada: boolean;
  } | null;
  eletrica: {
    corrente_pico_partida: number;
    corrente_trabalho_media: number;
    duty_cycle_percentual: number;
    potencia_estimada_watts: number;
    partidas_observadas: number;
    alerta_esforco_critico: boolean;
    alerta_compressor_travando: boolean;
  } | null;
  saude: {
    health_score: number | null;
    status_geral: string;
    fatores_de_risco: string[];
  };
};

export type Equipment = {
  id: number | string;
  name: string;
  place: string;
  temp: string;
  humidity: string;
  current: string;
  health: number | null;
  cost: string;
  status: EquipmentStatus;
  trend: EquipmentTrend;
  points: string;
  analysis?: AdvancedAnalysis | null;
  serial?: string;
  temperatureLabel?: string;
  humidityLabel?: string;
  currentLabel?: string;
  trendMessage?: string;
  telemetry?: {
    temperatureAverage: number | null;
    humidityAverage: number | null;
    currentMaximum: number | null;
    readingCount: number;
    times: (string | null)[];
    temperatures: (number | null)[];
    temperaturesSmoothed: (number | null)[];
    humidities: (number | null)[];
    humiditiesSmoothed: (number | null)[];
    currents: (number | null)[];
    currentsSmoothed: (number | null)[];
  } | null;
};

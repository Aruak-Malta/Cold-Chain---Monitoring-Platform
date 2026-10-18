export type EquipmentStatus = "normal" | "critical" | "warning" | "offline" | "historical" | "registered";
export type EquipmentTrend = "stable" | "rising" | "offline";

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
    humidities: (number | null)[];
    currents: (number | null)[];
  } | null;
};

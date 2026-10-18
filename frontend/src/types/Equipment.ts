export type EquipmentStatus = "normal" | "critical" | "warning" | "offline";
export type EquipmentTrend = "stable" | "rising" | "offline";

export type Equipment = {
  id: number;
  name: string;
  place: string;
  temp: string;
  humidity: string;
  current: string;
  health: number;
  cost: string;
  status: EquipmentStatus;
  trend: EquipmentTrend;
  points: string;
};

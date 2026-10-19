import type { IconName } from "./Icon";

export type AlertState = "Pendente" | "Reconhecido";
export type AlertLevel = "critical" | "warning";

export type Alert = {
  id: string;
  level: AlertLevel;
  title: string;
  equipmentName: string;
  equipmentSerial: string;
  detail: string;
  value: string;
  time: string;
  state: AlertState;
  icon: IconName;
};

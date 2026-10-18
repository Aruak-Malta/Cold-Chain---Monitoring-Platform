import type { IconName } from "./Icon";

export type AlertState = "Pendente" | "Reconhecido";

export type Alert = {
  id: number;
  level: "critical" | "offline" | "warning" | "normal";
  title: string;
  equipment: string;
  value: string;
  time: string;
  state: AlertState;
  icon: IconName;
};

import type { Alert } from "../types/Alert";

export const initialAlerts: Alert[] = [
  {
    id: 1,
    level: "critical",
    title: "Temperatura acima do limite",
    equipment: "Freezer de sorvetes 02",
    value: "−10,2°C",
    time: "Hoje, 10:42",
    state: "Pendente",
    icon: "thermometer",
  },
  {
    id: 2,
    level: "offline",
    title: "Equipamento sem comunicação",
    equipment: "Câmara fria — Laticínios",
    value: "14 min offline",
    time: "Hoje, 10:32",
    state: "Pendente",
    icon: "wifi",
  },
  {
    id: 3,
    level: "warning",
    title: "Duty cycle acima do esperado",
    equipment: "Expositor de bebidas",
    value: "82% ligado",
    time: "Hoje, 09:18",
    state: "Pendente",
    icon: "bolt",
  },
  {
    id: 4,
    level: "normal",
    title: "Possível porta aberta",
    equipment: "Câmara fria — Carnes",
    value: "Umidade +12%",
    time: "Ontem, 18:21",
    state: "Reconhecido",
    icon: "drop",
  },
];

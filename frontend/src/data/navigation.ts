import type { NavigationItem } from "../types/Navigation";

export const navigationItems: NavigationItem[] = [
  { icon: "grid", label: "Visão geral", path: "/painel" },
  { icon: "snow", label: "Equipamentos", path: "/painel/equipamentos" },
  { icon: "bell", label: "Avisos", path: "/painel/alertas" },
  { icon: "chart", label: "Análises", path: "/painel/analises" },
  { icon: "file", label: "Relatórios", path: "/painel/relatorios" },
];

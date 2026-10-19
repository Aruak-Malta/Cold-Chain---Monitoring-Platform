import type { NavigationItem } from "../types/Navigation";

export const navigationItems: NavigationItem[] = [
  { icon: "grid", label: "Visão geral", path: "/" },
  { icon: "snow", label: "Equipamentos", path: "/equipamentos" },
  { icon: "bell", label: "Avisos", path: "/alertas" },
  { icon: "chart", label: "Análises", path: "/analises" },
  { icon: "file", label: "Relatórios", path: "/relatorios" },
];

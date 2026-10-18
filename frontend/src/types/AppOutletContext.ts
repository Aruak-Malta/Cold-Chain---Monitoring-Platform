import type { Equipment } from "./Equipment";

export type AppOutletContext = {
  search: string;
  openEquipment: (equipment: Equipment) => void;
  openAddEquipment: () => void;
  notify: (message: string) => void;
};

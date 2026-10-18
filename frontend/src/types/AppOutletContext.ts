import type { Equipment } from "./Equipment";
import type { SessionEquipmentRecord } from "../services/sessionEquipmentService";

export type AppOutletContext = {
  search: string;
  sessionEquipments: SessionEquipmentRecord[];
  equipmentLoadError: string;
  openEquipment: (equipment: Equipment) => void;
  openAddEquipment: () => void;
  notify: (message: string) => void;
};

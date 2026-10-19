import type { Equipment } from "./Equipment";
import type {
  SessionDashboardSummary,
  SessionEquipmentRecord,
} from "../services/sessionEquipmentService";

export type AppOutletContext = {
  search: string;
  sessionEquipments: SessionEquipmentRecord[];
  equipmentLoadError: string;
  dashboardSummary: SessionDashboardSummary | null;
  dashboardSummaryError: string;
  acknowledgedAlertIds: string[];
  acknowledgeAlerts: (ids: string[]) => boolean;
  openEquipment: (equipment: Equipment) => void;
  openAddEquipment: () => void;
  notify: (message: string) => void;
};

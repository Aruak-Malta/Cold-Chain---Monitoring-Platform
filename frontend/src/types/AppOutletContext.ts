import type { Equipment } from "./Equipment";
import type {
  SessionDashboardSummary,
  SessionMode,
  SessionScope,
  SessionEquipmentRecord,
} from "../services/sessionEquipmentService";
import type { AccountDashboard } from "../services/supabase";

export type AppOutletContext = {
  search: string;
  mode: SessionMode;
  sessionScope: SessionScope;
  basePath: string;
  accountDashboard: AccountDashboard | null;
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

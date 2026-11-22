import type { Equipment } from "./Equipment";
import type {
  SessionDashboardSummary,
  SessionMode,
  SessionScope,
  SessionEquipmentRecord,
} from "../services/sessionEquipmentService";
import type { AccountCompany, AccountDashboard } from "../services/supabase";
import type { Alert } from "./Alert";

export type AppOutletContext = {
  search: string;
  mode: SessionMode;
  sessionScope: SessionScope;
  basePath: string;
  accountDashboard: AccountDashboard | null;
  selectedCompany: AccountCompany | null;
  selectCompany: (companyId: string | number) => void;
  sessionEquipments: SessionEquipmentRecord[];
  equipmentLoadError: string;
  dashboardSummary: SessionDashboardSummary | null;
  dashboardSummaryError: string;
  acknowledgedAlertIds: string[];
  acknowledgeAlerts: (ids: string[]) => boolean;
  accountAlerts: Alert[];
  openEquipment: (equipment: Equipment) => void;
  openAddEquipment: () => void;
  notify: (message: string) => void;
};

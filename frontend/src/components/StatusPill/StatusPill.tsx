import type { EquipmentStatus } from "../../types/Equipment";

const statusLabels: Record<EquipmentStatus, string> = {
  normal: "Normal",
  critical: "Crítico",
  warning: "Atenção",
  offline: "Offline",
};

export function StatusPill({ status }: Readonly<{ status: EquipmentStatus }>) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

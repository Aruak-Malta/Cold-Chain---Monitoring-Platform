import type { Equipment } from "../../types/Equipment";
import { Icon } from "../Icon/Icon";
import { StatusPill } from "../StatusPill/StatusPill";

type EquipmentCardProps = {
  equipment: Equipment;
  onOpen: () => void;
};

export function EquipmentCard({ equipment, onOpen }: Readonly<EquipmentCardProps>) {
  return (
    <article className={`equipment-card equipment-${equipment.status}`} onClick={onOpen}>
      <div className="card-top">
        <div className="equipment-title">
          <span className="equipment-icon"><Icon name="snow" /></span>
          <div><h3>{equipment.name}</h3><p>{equipment.place}</p></div>
        </div>
        <StatusPill status={equipment.status} />
      </div>
      <div className="temperature-row">
        <div>
          <small>{equipment.temperatureLabel ?? "Temperatura agora"}</small>
          <strong>{equipment.temp}</strong>
          <span className={`trend ${equipment.trend}`}>
            <Icon
              name={
                equipment.status === "historical"
                  ? "chart"
                  : equipment.status === "critical"
                    ? "arrow"
                    : equipment.status === "offline"
                      ? "wifi"
                      : "check"
              }
              size="sm"
            />
            {equipment.trendMessage ??
              (equipment.status === "critical"
                ? "+3,8° em 30 min"
                : equipment.status === "offline"
                  ? "Sem dados há 14 min"
                  : "Dentro do limite")}
          </span>
        </div>
        {/* <svg
          className={`sparkline spark-${equipment.status}`}
          viewBox="0 0 220 48"
          preserveAspectRatio="none"
          aria-label="Tendência de temperatura"
        >
          <path className="spark-area" d={`${equipment.points} L216 48 L4 48 Z`} />
          <path className="spark-path" d={equipment.points} />
        </svg> */}
      </div>
      <div className="sensor-row">
        <span><Icon name="drop" size="sm" /><small>{equipment.humidityLabel ?? "Umidade"}</small><strong>{equipment.humidity}</strong></span>
        <span><Icon name="bolt" size="sm" /><small>{equipment.currentLabel ?? "Corrente"}</small><strong>{equipment.current}</strong></span>
        <span>
          <Icon name="chart" size="sm" />
          <small>Saúde</small>
          <strong className={equipment.health !== null && equipment.health < 70 ? "score-low" : ""}>
            {equipment.health ?? "—"}
          </strong>
        </span>
      </div>
      <div className="card-bottom">
        <span><small>Custo no mês</small><strong>{equipment.cost}</strong></span>
        <button aria-label={`Abrir detalhes de ${equipment.name}`} type="button">
          <span>Ver detalhes</span><Icon name="chevron" size="sm" />
        </button>
      </div>
    </article>
  );
}

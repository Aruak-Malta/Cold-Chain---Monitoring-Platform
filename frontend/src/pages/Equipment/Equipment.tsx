import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { EquipmentCard } from "../../components/EquipmentCard/EquipmentCard";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { equipment } from "../../data/equipment";
import type { AppOutletContext } from "../../types/AppOutletContext";

export function Equipment() {
  const { search, openEquipment, openAddEquipment, notify } = useOutletContext<AppOutletContext>();
  const [status, setStatus] = useState("Todos");
  const [sector, setSector] = useState("Todos os setores");

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = `${item.name} ${item.place}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      status === "Todos" ||
      (status === "Online" && item.status !== "offline") ||
      (status === "Offline" && item.status === "offline");
    const matchesSector = sector === "Todos os setores" || item.place.includes(sector);
    return matchesSearch && matchesStatus && matchesSector;
  });

  return (
    <>
      <PageTitle
        eyebrow="FROTA CONECTADA"
        title="Equipamentos"
        description="Gerencie dispositivos, limites e condições operacionais."
        action={
          <Button variant="primary" onClick={openAddEquipment}>
            <Icon name="plus" />Novo equipamento
          </Button>
        }
      />
      <div className="toolbar-panel">
        <div className="filter-tabs">
          {["Todos", "Online", "Offline"].map((item) => (
            <button key={item} className={status === item ? "selected" : ""} onClick={() => setStatus(item)} type="button">
              {item}
            </button>
          ))}
        </div>
        <label className="select-field">
          Setor
          <select value={sector} onChange={(event) => setSector(event.target.value)}>
            <option>Todos os setores</option><option>Açougue</option><option>Congelados</option><option>Bebidas</option><option>Laticínios</option>
          </select>
        </label>
        <Button onClick={() => notify("Lista de equipamentos exportada em CSV.")}>
          <Icon name="file" size="sm" />Exportar lista
        </Button>
      </div>
      <div className="equipment-grid page-equipment-grid">
        {filteredEquipment.map((item) => (
          <EquipmentCard key={item.id} equipment={item} onOpen={() => openEquipment(item)} />
        ))}
      </div>
      {!filteredEquipment.length && (
        <div className="empty-state">
          <Icon name="search" size="lg" />
          <strong>Nenhum equipamento encontrado</strong>
          <span>Ajuste os filtros para visualizar outros dispositivos.</span>
        </div>
      )}
    </>
  );
}

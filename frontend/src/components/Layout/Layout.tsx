import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigationItems } from "../../data/navigation";
import {
  fetchSessionEquipments,
  parseSessionEquipmentList,
} from "../../services/sessionEquipmentService";
import type { SessionEquipmentRecord } from "../../services/sessionEquipmentService";
import type { Equipment } from "../../types/Equipment";
import { AddEquipmentModal } from "../AddEquipmentModal/AddEquipmentModal";
import { DetailDrawer } from "../DetailDrawer/DetailDrawer";
import { Header } from "../Header/Header";
import { Icon } from "../Icon/Icon";
import { Sidebar } from "../Sidebar/Sidebar";

function readCachedEquipments(): SessionEquipmentRecord[] {
  try {
    const storedEquipments = sessionStorage.getItem("equipamentos");
    if (!storedEquipments) {
      return [];
    }

    const parsedEquipments: unknown = JSON.parse(storedEquipments);
    return parseSessionEquipmentList({ equipamentos: parsedEquipments });
  } catch (error) {
    console.error("Não foi possível ler os equipamentos salvos nesta aba:", error);
    return [];
  }
}

export function Layout() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sessionEquipments, setSessionEquipments] = useState<SessionEquipmentRecord[]>(readCachedEquipments);
  const [equipmentLoadError, setEquipmentLoadError] = useState("");
  const equipmentChangedDuringLoad = useRef(false);

  useEffect(() => {
    let isMounted = true;
    fetchSessionEquipments()
      .then((equipments) => {
        if (isMounted && !equipmentChangedDuringLoad.current) {
          setSessionEquipments(equipments);
          setEquipmentLoadError("");
        }
      })
      .catch((error: unknown) => {
        console.error("Erro ao carregar equipamentos da sessão:", error);
        if (isMounted && !equipmentChangedDuringLoad.current) {
          setEquipmentLoadError("Não foi possível carregar os equipamentos salvos nesta sessão.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function handleEquipmentAdded(equipments: SessionEquipmentRecord[]) {
    equipmentChangedDuringLoad.current = true;
    setSessionEquipments(equipments);
    setEquipmentLoadError("");
  }

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} close={() => setMobileOpen(false)} />
      <main className="main-content">
        <Header
          search={search}
          onSearch={setSearch}
          openMenu={() => setMobileOpen(true)}
          openAddEquipment={() => setAddModalOpen(true)}
        />
        <div className="content-wrap">
          <Outlet
            context={{
              search,
              sessionEquipments,
              equipmentLoadError,
              openEquipment: setSelectedEquipment,
              openAddEquipment: () => setAddModalOpen(true),
              notify,
            }}
          />
        </div>
      </main>
      <nav className="bottom-nav">
        {navigationItems.slice(0, 4).map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/"}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.count && <b>{item.count}</b>}
          </NavLink>
        ))}
      </nav>
      {selectedEquipment && (
        <DetailDrawer equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} />
      )}
      {addModalOpen && (
        <AddEquipmentModal
          close={() => setAddModalOpen(false)}
          notify={notify}
          onEquipmentAdded={handleEquipmentAdded}
        />
      )}
      {toast && <div className="toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}

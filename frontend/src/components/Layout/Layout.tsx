import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigationItems } from "../../data/navigation";
import type { Equipment } from "../../types/Equipment";
import { AddEquipmentModal } from "../AddEquipmentModal/AddEquipmentModal";
import { DetailDrawer } from "../DetailDrawer/DetailDrawer";
import { Header } from "../Header/Header";
import { Icon } from "../Icon/Icon";
import { Sidebar } from "../Sidebar/Sidebar";

export function Layout() {
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
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
        <AddEquipmentModal close={() => setAddModalOpen(false)} notify={notify} />
      )}
      {toast && <div className="toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}

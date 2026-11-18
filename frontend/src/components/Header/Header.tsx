import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

type HeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  openMenu: () => void;
  openAddEquipment: () => void;
  basePath: string;
  hasNotifications: boolean;
};

export function Header({
  search,
  onSearch,
  openMenu,
  openAddEquipment,
  basePath,
  hasNotifications,
}: Readonly<HeaderProps>) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const dateParts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(now);
  const day = dateParts.find((part) => part.type === "day")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value.replace(/\.$/, "");
  const year = dateParts.find((part) => part.type === "year")?.value;
  const date = `${day} ${month}, ${year}`;

  return (
    <header className="topbar">
      <Button variant="ghost" className="mobile-menu" label="Abrir menu" onClick={openMenu}>
        <Icon name="menu" />
      </Button>
      <div className="top-search">
        <Icon name="search" />
        <input
          aria-label="Buscar"
          placeholder="Buscar equipamento, setor..."
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <button className="notification-button" aria-label={hasNotifications ? "Notificações não lidas" : "Notificações"} onClick={() => navigate(`${basePath}/alertas`)} type="button">
          <Icon name="bell" />{hasNotifications && <span />}
        </button>
        <div className="date-block">
          <small>{weekday}</small>
          <strong>{date}</strong>
        </div>
        <Button variant="primary" className="add-button" onClick={openAddEquipment}>
          <Icon name="plus" />Adicionar equipamento
        </Button>
      </div>
    </header>
  );
}

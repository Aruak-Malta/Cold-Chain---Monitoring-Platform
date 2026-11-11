import { useNavigate } from "react-router-dom";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

type HeaderProps = {
  search: string;
  onSearch: (value: string) => void;
  openMenu: () => void;
  openAddEquipment: () => void;
};

export function Header({
  search,
  onSearch,
  openMenu,
  openAddEquipment,
}: Readonly<HeaderProps>) {
  const navigate = useNavigate();

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
        <button className="notification-button" aria-label="Notificações" onClick={() => navigate("/painel/alertas")} type="button">
          <Icon name="bell" /><span />
        </button>
        <div className="date-block"><small>terça-feira</small><strong>18 jun, 2025</strong></div>
        <Button variant="primary" className="add-button" onClick={openAddEquipment}>
          <Icon name="plus" />Adicionar equipamento
        </Button>
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { EquipmentCard } from "../../components/EquipmentCard/EquipmentCard";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { equipment } from "../../data/equipment";
import { fetchCompanyEquipments } from "../../services/supabase";
import { toEquipment } from "../../services/sessionEquipmentService";
import type { AccountCompany, AccountEquipmentRecord } from "../../services/supabase";
import type { SessionEquipmentRecord } from "../../services/sessionEquipmentService";
import type { AppOutletContext } from "../../types/AppOutletContext";

type CompanyEquipment = {
  equipment: AccountEquipmentRecord;
  company: AccountCompany;
};

export function Equipment() {
  const {
    search,
    mode,
    accountDashboard,
    sessionEquipments,
    equipmentLoadError,
    openEquipment,
    openAddEquipment,
  } = useOutletContext<AppOutletContext>();
  const [status, setStatus] = useState("Todos");
  const [sector, setSector] = useState("Todos os setores");
  const [companyId, setCompanyId] = useState("all");
  const [companyEquipments, setCompanyEquipments] = useState<CompanyEquipment[]>([]);
  const [companyEquipmentError, setCompanyEquipmentError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const companies = accountDashboard?.companies ?? [];

    if (!companies.length) {
      setCompanyEquipments([]);
      setCompanyEquipmentError("");
      return () => {
        isMounted = false;
      };
    }

    void Promise.all(
      companies.map(async (company) => ({
        company,
        equipments: await fetchCompanyEquipments(company.id_company),
      })),
    ).then((results) => {
      if (isMounted) {
        setCompanyEquipments(
          results.flatMap(({ company, equipments }) =>
            equipments.map((item) => ({ equipment: item, company })),
          ),
        );
        setCompanyEquipmentError("");
      }
    }).catch((error: unknown) => {
      console.error("Erro ao carregar equipamentos das empresas:", error);
      if (isMounted) {
        setCompanyEquipmentError(
          error instanceof Error ? error.message : "Não foi possível carregar os equipamentos das empresas.",
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [accountDashboard]);

  const uploadedEquipment = sessionEquipments.map((item, index) => toEquipment(item, index));
  const displayedEquipment = accountDashboard
    ? companyEquipments.map(({ equipment: item, company }, index) => {
        const sessionRecord = sessionEquipments.find(
          (record) => record.serial.trim().toLowerCase() === item.serial.trim().toLowerCase(),
        );
        const record: SessionEquipmentRecord = sessionRecord ?? {
          nome: item.nome,
          serial: item.serial,
          setor: item.setor ?? undefined,
          tensao: item.tensao ?? undefined,
          telemetria: null,
        };
        return {
          ...toEquipment(record, index),
          id: item.id_equipamento,
          place: item.setor ?? "Sem setor",
          macAddress: item.serial,
          companyId: item.id_company,
          companyName: company.nome,
        };
      })
    : uploadedEquipment.length
      ? uploadedEquipment
      : mode === "demo"
        ? equipment.slice(0, 1)
        : [];

  const filteredEquipment = displayedEquipment.filter((item) => {
    const matchesSearch = `${item.name} ${item.place} ${item.macAddress ?? ""} ${item.companyName ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      status === "Todos" ||
      (status === "Com análise" && item.analysis !== null && item.analysis !== undefined);
    const matchesSector = sector === "Todos os setores" || item.place.includes(sector);
    const matchesCompany = companyId === "all" || String(item.companyId) === companyId;
    return matchesSearch && matchesStatus && matchesSector && matchesCompany;
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
          {["Todos", "Com análise"].map((item) => (
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
        {accountDashboard && (
          <label className="select-field">
            Empresa
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="all">Todas as empresas</option>
              {accountDashboard.companies.map((company) => (
                <option key={company.id_company} value={String(company.id_company)}>{company.nome}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {equipmentLoadError && (
        <div className="empty-state" role="alert">
          <strong>Não foi possível carregar os equipamentos cadastrados.</strong>
          <span>{equipmentLoadError}</span>
        </div>
      )}
      {companyEquipmentError && (
        <div className="empty-state" role="alert">
          <strong>Não foi possível carregar os equipamentos das empresas.</strong>
          <span>{companyEquipmentError}</span>
        </div>
      )}
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

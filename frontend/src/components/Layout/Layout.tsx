import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { navigationItems } from "../../data/navigation";
import {
  fetchSessionDashboardSummary,
  fetchSessionEquipments,
  getEquipmentStorageKey,
  parseSessionEquipmentList,
} from "../../services/sessionEquipmentService";
import type {
  SessionMode,
  SessionScope,
} from "../../services/sessionEquipmentService";
import {
  getSessionAlerts,
  readAcknowledgedAlertIds,
  saveAcknowledgedAlertIds,
} from "../../services/sessionAlertService";
import {
  readSelectedCompanyId,
  saveSelectedCompanyId,
} from "../../services/companySelectionService";
import {
  fetchAccountDashboard,
  fetchCompanyEquipments,
  getSupabaseClient,
} from "../../services/supabase";
import type {
  SessionDashboardSummary,
  SessionEquipmentRecord,
} from "../../services/sessionEquipmentService";
import type { AccountDashboard, AccountEquipmentRecord } from "../../services/supabase";
import type { Equipment } from "../../types/Equipment";
import { AddEquipmentModal } from "../AddEquipmentModal/AddEquipmentModal";
import { DetailDrawer } from "../DetailDrawer/DetailDrawer";
import { Header } from "../Header/Header";
import { Icon } from "../Icon/Icon";
import { Sidebar } from "../Sidebar/Sidebar";

function readCachedEquipments(scope: SessionScope): SessionEquipmentRecord[] {
  try {
    const storedEquipments = sessionStorage.getItem(getEquipmentStorageKey(scope));
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

function mergeAccountEquipments(
  accountEquipments: AccountEquipmentRecord[],
  sessionEquipments: SessionEquipmentRecord[],
): SessionEquipmentRecord[] {
  const sessionBySerial = new Map(
    sessionEquipments.map((equipment) => [equipment.serial.trim().toLowerCase(), equipment]),
  );

  return accountEquipments.map((equipment) => {
    const sessionEquipment = sessionBySerial.get(equipment.serial.trim().toLowerCase());
    return {
      nome: equipment.nome,
      serial: equipment.serial,
      setor: equipment.setor ?? undefined,
      tensao: equipment.tensao ?? undefined,
      telemetria: sessionEquipment?.telemetria ?? null,
      analise_avancada: sessionEquipment?.analise_avancada ?? null,
    };
  });
}

type LayoutProps = {
  mode?: SessionMode;
};

export function Layout({ mode = "demo" }: Readonly<LayoutProps>) {
  const navigate = useNavigate();
  const basePath = mode === "demo" ? "/demo" : "/app";
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [sessionScope, setSessionScope] = useState<SessionScope>(mode === "demo" ? "demo" : "account:pending");
  const [sessionEquipments, setSessionEquipments] = useState<SessionEquipmentRecord[]>(
    () => readCachedEquipments(mode === "demo" ? "demo" : "account:pending"),
  );
  const [equipmentLoadError, setEquipmentLoadError] = useState("");
  const [dashboardSummary, setDashboardSummary] = useState<SessionDashboardSummary | null>(null);
  const [dashboardSummaryError, setDashboardSummaryError] = useState("");
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<string[]>(
    () => readAcknowledgedAlertIds(mode === "demo" ? "demo" : "account:pending"),
  );
  const [accountDashboard, setAccountDashboard] = useState<AccountDashboard | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(mode === "account");
  const [accountLoadError, setAccountLoadError] = useState("");
  const accountUserId = useRef<string | null>(null);
  const equipmentDataRequestId = useRef(0);
  const pendingAlertCount = equipmentLoadError
    ? 0
    : getSessionAlerts(sessionEquipments).filter((alert) => !acknowledgedAlertIds.includes(alert.id)).length;

  async function loadScopeData(scope: SessionScope, companyId?: number | string) {
    const requestId = ++equipmentDataRequestId.current;
    const accountEquipmentRequest = mode === "account" && companyId !== undefined
      ? fetchCompanyEquipments(companyId)
      : Promise.resolve(null);
    const [sessionResult, accountResult, summaryResult] = await Promise.allSettled([
      fetchSessionEquipments(scope),
      accountEquipmentRequest,
      fetchSessionDashboardSummary(scope),
    ]);

    if (requestId !== equipmentDataRequestId.current) {
      return;
    }

    const sessionRecords = sessionResult.status === "fulfilled" ? sessionResult.value : [];
    const accountRecords = accountResult.status === "fulfilled" ? accountResult.value : null;
    setSessionEquipments(
      accountRecords ? mergeAccountEquipments(accountRecords, sessionRecords) : sessionRecords,
    );

    const loadErrors: string[] = [];
    if (sessionResult.status === "rejected") {
      console.error("Erro ao carregar telemetria da sessão:", sessionResult.reason);
      loadErrors.push("Não foi possível carregar os dados de telemetria desta sessão.");
    }
    if (accountResult.status === "rejected") {
      console.error("Erro ao carregar equipamentos da empresa:", accountResult.reason);
      loadErrors.push(
        accountResult.reason instanceof Error
          ? accountResult.reason.message
          : "Não foi possível carregar os equipamentos da empresa.",
      );
    }
    setEquipmentLoadError(loadErrors.join(" "));

    if (summaryResult.status === "fulfilled") {
      setDashboardSummary({
        ...summaryResult.value,
        total_equipamentos: accountRecords?.length ?? summaryResult.value.total_equipamentos,
      });
      setDashboardSummaryError("");
    } else {
      console.error("Erro ao carregar resumo da sessão:", summaryResult.reason);
      setDashboardSummaryError("Não foi possível carregar as métricas da sessão.");
    }
  }

  useEffect(() => {
    let isMounted = true;

    if (mode === "demo") {
      void loadScopeData("demo");
    } else {
      void (async () => {
        try {
          const { data, error } = await getSupabaseClient().auth.getUser();
          if (error) {
            throw new Error(`Não foi possível validar sua sessão: ${error.message}`);
          }
          if (!data.user?.email) {
            navigate("/painel", { replace: true });
            return;
          }

          const dashboard = await fetchAccountDashboard(data.user.email);
          if (!dashboard || !dashboard.companies.length) {
            navigate("/empresas", { replace: true });
            return;
          }
          if (!isMounted) return;

          const storedCompanyId = readSelectedCompanyId(dashboard.email);
          const selectedCompany = dashboard.companies.find(
            (company) => String(company.id_company) === storedCompanyId,
          ) ?? dashboard.companies[0];
          const nextCompanyId = String(selectedCompany.id_company);
          const accountScope = `account:${data.user.id}:${nextCompanyId}` as const;

          accountUserId.current = data.user.id;
          setSessionScope(accountScope);
          setSessionEquipments([]);
          setAcknowledgedAlertIds(readAcknowledgedAlertIds(accountScope));
          setSelectedCompanyId(nextCompanyId);
          if (storedCompanyId !== nextCompanyId) {
            saveSelectedCompanyId(dashboard.email, nextCompanyId);
          }
          setAccountDashboard(dashboard);
          setAccountLoadError("");
          await loadScopeData(accountScope, selectedCompany.id_company);
        } catch (error) {
          console.error("Erro ao validar os dados da conta:", error);
          if (isMounted) {
            setAccountLoadError(
              error instanceof Error ? error.message : "Não foi possível carregar os dados da conta.",
            );
          }
        } finally {
          if (isMounted) setAccountLoading(false);
        }
      })();
    }

    return () => {
      isMounted = false;
      equipmentDataRequestId.current += 1;
    };
  }, [mode, navigate]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function acknowledgeAlerts(ids: string[]): boolean {
    const nextIds = [...new Set([...acknowledgedAlertIds, ...ids])];
    setAcknowledgedAlertIds(nextIds);
    return saveAcknowledgedAlertIds(nextIds, sessionScope);
  }

  function selectCompany(companyId: string | number) {
    const companyIdString = String(companyId);
    setSelectedCompanyId(companyIdString);
    const scope = accountUserId.current
      ? `account:${accountUserId.current}:${companyIdString}` as const
      : sessionScope;
    setSessionScope(scope);
    setSessionEquipments([]);
    setAcknowledgedAlertIds(readAcknowledgedAlertIds(scope));
    if (accountDashboard && !saveSelectedCompanyId(accountDashboard.email, companyIdString)) {
      notify("Empresa selecionada, mas a preferência não pôde ser salva neste navegador.");
    }
    void loadScopeData(scope, companyId);
  }

  async function handleEquipmentAdded(equipments?: SessionEquipmentRecord[]) {
    if (mode === "account") {
      await loadScopeData(sessionScope, selectedCompanyId ?? undefined);
      return;
    }

    if (equipments) {
      setSessionEquipments(equipments);
      setEquipmentLoadError("");
      try {
        setDashboardSummary(await fetchSessionDashboardSummary(sessionScope));
        setDashboardSummaryError("");
      } catch (error) {
        console.error("Erro ao atualizar resumo da sessão:", error);
        setDashboardSummaryError("Não foi possível atualizar as métricas da sessão.");
      }
    } else {
      await loadScopeData(sessionScope);
    }
  }

  if (mode === "account" && accountLoading) {
    return <main className="auth-loading" aria-live="polite">Carregando seu painel...</main>;
  }

  if (mode === "account" && accountLoadError) {
    return <main className="auth-loading" role="alert">{accountLoadError}</main>;
  }

  const selectedCompany = accountDashboard?.companies.find(
    (company) => String(company.id_company) === selectedCompanyId,
  ) ?? accountDashboard?.companies[0] ?? null;

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        close={() => setMobileOpen(false)}
        pendingAlertCount={pendingAlertCount}
        basePath={basePath}
        accountDashboard={accountDashboard}
        selectedCompany={selectedCompany}
        onSelectCompany={selectCompany}
      />
      <main className="main-content">
        <Header
          search={search}
          onSearch={setSearch}
          openMenu={() => setMobileOpen(true)}
          openAddEquipment={() => setAddModalOpen(true)}
          basePath={basePath}
          hasNotifications={pendingAlertCount > 0}
        />
        <div className="content-wrap">
          <Outlet
            context={{
              search,
              mode,
              sessionScope,
              basePath,
              accountDashboard,
              selectedCompany,
              selectCompany,
              sessionEquipments,
              equipmentLoadError,
              dashboardSummary,
              dashboardSummaryError,
              acknowledgedAlertIds,
              acknowledgeAlerts,
              openEquipment: setSelectedEquipment,
              openAddEquipment: () => setAddModalOpen(true),
              notify,
            }}
          />
        </div>
      </main>
      <nav className="bottom-nav">
        {navigationItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path.replace("/demo", basePath)}
            end={item.path === "/demo"}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.path === "/demo/alertas" && pendingAlertCount > 0 && <b>{pendingAlertCount}</b>}
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
          scope={sessionScope}
          companyId={selectedCompany?.id_company ?? null}
        />
      )}
      {toast && <div className="toast"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  );
}

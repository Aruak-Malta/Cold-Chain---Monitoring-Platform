import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { energyTariffStorageKey } from "../../services/reportService";
import type { AppOutletContext } from "../../types/AppOutletContext";
import {
  fetchCompanyEquipmentLimits,
  saveEquipmentLimits,
} from "../../services/supabase";
import type { AccountEquipmentLimit } from "../../services/supabase";

const tabs = ["Limites e alertas", "Energia e tarifas", "Notificações", "Usuários e acesso", "Conectividade"];

function readEnergyTariff(): string {
  try {
    return localStorage.getItem(energyTariffStorageKey) ?? "0.85";
  } catch (error) {
    console.error("Não foi possível ler a tarifa de energia salva:", error);
    return "0.85";
  }
}

export function Settings() {
  const { notify, selectedCompany, mode } = useOutletContext<AppOutletContext>();
  const [tab, setTab] = useState("Limites e alertas");
  const [energyTariff, setEnergyTariff] = useState(readEnergyTariff);
  const [equipmentLimits, setEquipmentLimits] = useState<Array<AccountEquipmentLimit & { mac_address: string; nome_equipamento: string }>>([]);
  const [selectedLimitId, setSelectedLimitId] = useState("");
  const [temperatureMin, setTemperatureMin] = useState("-22");
  const [temperatureMax, setTemperatureMax] = useState("12");
  const [tolerance, setTolerance] = useState("5");
  const [watchdog, setWatchdog] = useState("10");
  const [loadingLimits, setLoadingLimits] = useState(false);

  useEffect(() => {
    if (mode !== "account" || !selectedCompany) {
      setEquipmentLimits([]);
      return;
    }
    setLoadingLimits(true);
    void fetchCompanyEquipmentLimits(selectedCompany.id_company)
      .then((limits) => {
        setEquipmentLimits(limits);
        const selected = limits[0];
        if (selected) {
          setSelectedLimitId(String(selected.id_equipamento));
          setTemperatureMin(String(selected.temperatura_minima));
          setTemperatureMax(String(selected.temperatura_maxima));
          setTolerance(String(selected.tolerancia_minutos));
          setWatchdog(String(selected.watchdog_minutos));
        }
      })
      .catch((error: unknown) => {
        console.error("Erro ao carregar limites:", error);
        notify(error instanceof Error ? error.message : "Não foi possível carregar os limites.");
      })
      .finally(() => setLoadingLimits(false));
  }, [mode, selectedCompany, notify]);

  function selectEquipmentLimit(id: string) {
    setSelectedLimitId(id);
    const selected = equipmentLimits.find((limit) => String(limit.id_equipamento) === id);
    if (selected) {
      setTemperatureMin(String(selected.temperatura_minima));
      setTemperatureMax(String(selected.temperatura_maxima));
      setTolerance(String(selected.tolerancia_minutos));
      setWatchdog(String(selected.watchdog_minutos));
    }
  }

  function saveSettings() {
    if (tab === "Limites e alertas" && mode === "account") {
      void saveTemperatureLimits();
      return;
    }
    if (tab === "Energia e tarifas") {
      const tariff = Number(energyTariff);
      if (!Number.isFinite(tariff) || tariff < 0) {
        notify("Informe uma tarifa de energia válida (zero ou maior).");
        return;
      }
      try {
        localStorage.setItem(energyTariffStorageKey, String(tariff));
      } catch (error) {
        console.error("Não foi possível salvar a tarifa de energia:", error);
        notify("Não foi possível salvar a tarifa de energia neste navegador.");
        return;
      }
    }
    notify("Configurações salvas com sucesso.");
  }

  async function saveTemperatureLimits() {
    if (!selectedLimitId) {
      notify("Selecione um equipamento antes de salvar os limites.");
      return;
    }
    const minimum = Number(temperatureMin);
    const maximum = Number(temperatureMax);
    const toleranceMinutes = Number(tolerance);
    const watchdogMinutes = Number(watchdog);
    if (
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum >= maximum ||
      !Number.isInteger(toleranceMinutes) ||
      toleranceMinutes < 0 ||
      !Number.isInteger(watchdogMinutes) ||
      watchdogMinutes < 1
    ) {
      notify("Informe limites térmicos válidos e tolerâncias em minutos.");
      return;
    }
    try {
      await saveEquipmentLimits(selectedLimitId, {
        temperatura_minima: minimum,
        temperatura_maxima: maximum,
        tolerancia_minutos: toleranceMinutes,
        watchdog_minutos: watchdogMinutes,
      });
      notify("Limites do equipamento salvos no Supabase.");
    } catch (error) {
      console.error("Erro ao salvar limites:", error);
      notify(error instanceof Error ? error.message : "Não foi possível salvar os limites.");
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRAÇÃO"
        title="Configurações"
        description="Defina limites, tarifas, notificações e regras do sistema."
        action={<Button variant="primary" onClick={saveSettings}><Icon name="check" />Salvar alterações</Button>}
      />
      <div className="settings-layout">
        <div className="settings-nav">
          {tabs.map((item) => (
            <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item} type="button">
              {item}<Icon name="chevron" size="sm" />
            </button>
          ))}
        </div>
        <div className="panel settings-form">
          <div className="settings-heading">
            <span className="summary-icon blue"><Icon name={tab === "Energia e tarifas" ? "bolt" : tab === "Notificações" ? "bell" : tab === "Conectividade" ? "wifi" : tab === "Usuários e acesso" ? "settings" : "thermometer"} /></span>
            <div><h2>{tab}</h2><p>Configure as regras aplicadas ao estabelecimento.</p></div>
          </div>
          {tab === "Limites e alertas" && <div className="form-grid">
            {mode === "account" ? (
              <label>
                Equipamento
                <select value={selectedLimitId} onChange={(event) => selectEquipmentLimit(event.target.value)} disabled={loadingLimits}>
                  {!equipmentLimits.length && <option value="">Nenhum equipamento vinculado</option>}
                  {equipmentLimits.map((limit) => (
                    <option key={limit.id_equipamento} value={String(limit.id_equipamento)}>
                      {limit.nome_equipamento} · {limit.mac_address}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>Equipamento<select disabled><option>Somente no painel da conta</option></select></label>
            )}
            <label>Temperatura mínima<input type="number" value={temperatureMin} onChange={(event) => setTemperatureMin(event.target.value)} /><small>Graus Celsius</small></label>
            <label>Temperatura máxima<input type="number" value={temperatureMax} onChange={(event) => setTemperatureMax(event.target.value)} /><small>Graus Celsius</small></label>
            <label>Tolerância antes do alerta<select value={tolerance} onChange={(event) => setTolerance(event.target.value)}><option value="0">Imediato</option><option value="5">5 minutos</option><option value="10">10 minutos</option></select></label>
            <label>Watchdog de inatividade<select value={watchdog} onChange={(event) => setWatchdog(event.target.value)}><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option></select></label>
          </div>}
          {tab === "Energia e tarifas" && <div className="form-grid">
            <label>Tarifa de energia<input type="number" value={energyTariff} onChange={(event) => setEnergyTariff(event.target.value)} step="0.01" min="0" /><small>R$/kWh</small></label>
            <label>Bandeira tarifária<select><option>Verde</option><option>Amarela</option><option>Vermelha</option></select></label>
            <label>Meta mensal<input type="number" defaultValue="10000" /><small>kWh</small></label>
            <label>Fator de CO₂<input type="number" defaultValue="0.084" step="0.001" /></label>
          </div>}
          {tab === "Notificações" && <div className="toggle-list">
            {["E-mail para alertas críticos", "Notificação de equipamento offline", "Escalonamento após 30 minutos", "Resumo semanal para supervisores"].map((item, index) => (
              <label key={item}><span><strong>{item}</strong><small>{index === 0 ? "Enviado imediatamente aos responsáveis." : "Pode ser alterado a qualquer momento."}</small></span><span className="switch"><input type="checkbox" defaultChecked={index < 3} /><span /></span></label>
            ))}
          </div>}
          {tab === "Usuários e acesso" && <div className="toggle-list">
            {["Marina Rocha · Administradora", "Carlos Lima · Técnico", "Equipe Loja Centro · Operador"].map((item, index) => (
              <label key={item}><span><strong>{item}</strong><small>{index === 0 ? "marina@empresa.com.br" : index === 1 ? "carlos@empresa.com.br" : "3 usuários vinculados"}</small></span><Button onClick={() => notify(`Permissões de ${item.split(" · ")[0]} abertas.`)}>Gerenciar</Button></label>
            ))}
          </div>}
          {tab === "Conectividade" && <div className="form-grid">
            <label>Protocolo<select><option>MQTT com TLS</option><option>HTTP REST</option></select></label>
            <label>Intervalo de leitura<select><option>30 segundos</option><option>1 minuto</option><option>5 minutos</option></select></label>
            <label>Reconexão progressiva<select><option>Ativada</option><option>Desativada</option></select></label>
            <label>Retenção do buffer<select><option>7 dias</option><option>15 dias</option><option>30 dias</option></select></label>
          </div>}
        </div>
      </div>
    </>
  );
}

import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { PageTitle } from "../../components/PageTitle/PageTitle";
import { energyTariffStorageKey } from "../../services/reportService";
import type { AppOutletContext } from "../../types/AppOutletContext";

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
  const { notify } = useOutletContext<AppOutletContext>();
  const [tab, setTab] = useState("Limites e alertas");
  const [energyTariff, setEnergyTariff] = useState(readEnergyTariff);

  function saveSettings() {
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
            <label>Temperatura mínima<input type="number" defaultValue="-22" /><small>Graus Celsius</small></label>
            <label>Temperatura máxima<input type="number" defaultValue="-12" /><small>Graus Celsius</small></label>
            <label>Tolerância antes do alerta<select defaultValue="5 minutos"><option>Imediato</option><option>5 minutos</option><option>10 minutos</option></select></label>
            <label>Watchdog de inatividade<select defaultValue="10 minutos"><option>5 minutos</option><option>10 minutos</option><option>15 minutos</option></select></label>
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

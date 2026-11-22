import { useState } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import jsonIcon from "../../assets/icons8-json-48.png";
import {
  analyzeSessionEquipment,
  apiUrl,
  getEquipmentStorageKey,
  getSessionId,
  parseSessionEquipmentList,
} from "../../services/sessionEquipmentService";
import type {
  SessionEquipmentRecord,
  SessionScope,
} from "../../services/sessionEquipmentService";
import { saveCompanyEquipment } from "../../services/supabase";

type AddEquipmentModalProps = {
  close: () => void;
  notify: (message: string) => void;
  onEquipmentAdded: (equipments?: SessionEquipmentRecord[]) => void | Promise<void>;
  scope: SessionScope;
  companyId: number | string | null;
};

export function AddEquipmentModal({
  close,
  notify,
  onEquipmentAdded,
  scope,
  companyId,
}: Readonly<AddEquipmentModalProps>) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [sector, setSector] = useState("Congelados");
  const [voltage, setVoltage] = useState<127 | 220>(220);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }

  async function submitToSession(): Promise<SessionEquipmentRecord[]> {
    const formData = new FormData();
    formData.append("nome", name.trim());
    formData.append("serial", serial.trim());
    formData.append("setor", sector);
    if (file) {
      formData.append("file", file);
    }

    const response = await fetch(`${apiUrl}/equipamentos`, {
      method: "POST",
      headers: { "X-Session-ID": getSessionId(scope) },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        response.status === 409
          ? "Já existe um equipamento com esse MAC Address nesta sessão."
          : `Não foi possível cadastrar o equipamento na sessão (erro ${response.status}).`,
      );
    }

    return parseSessionEquipmentList(await response.json());
  }

  function analyzeUploadedHistory() {
    window.setTimeout(() => {
      void analyzeSessionEquipment(serial.trim(), scope)
        .then((updatedEquipments) => {
          sessionStorage.setItem(getEquipmentStorageKey(scope), JSON.stringify(updatedEquipments));
          void onEquipmentAdded(updatedEquipments);
          notify(`Análise histórica de ${name} concluída.`);
        })
        .catch((error: unknown) => {
          console.error(`Não foi possível analisar o histórico de ${name}:`, error);
          notify(`${name} foi cadastrado, mas a análise do histórico falhou. Recarregue a página para tentar novamente.`);
        });
    }, 0);
  }

  async function submit() {
    if (submitting) {
      return;
    }

    if (!name.trim() || !serial.trim()) {
      notify("Preencha o nome e o MAC Address.");
      return;
    }

    setSubmitting(true);
    notify(
      file
        ? `A processar o ficheiro ${file.name}...`
        : scope === "demo"
          ? `Cadastrando ${name}...`
          : `Vinculando ${name} à empresa...`,
    );
    try {
      if (scope === "demo") {
        const equipments = await submitToSession();
        sessionStorage.setItem(getEquipmentStorageKey(scope), JSON.stringify(equipments));
        await onEquipmentAdded(equipments);
        notify(
          file
            ? `${name} cadastrado. A análise do histórico está em andamento.`
            : `${name} foi adicionado e aguarda a primeira conexão.`,
        );
        close();
        if (file) {
          analyzeUploadedHistory();
        }
        return;
      }

      if (companyId === null) {
        throw new Error("Selecione uma empresa antes de vincular o equipamento.");
      }

      await saveCompanyEquipment({
        id_company: companyId,
        nome: name.trim(),
        serial: serial.trim(),
        setor: sector,
        tensao: voltage,
      });

      if (file) {
        try {
          const sessionEquipments = await submitToSession();
          sessionStorage.setItem(getEquipmentStorageKey(scope), JSON.stringify(sessionEquipments));
          await onEquipmentAdded(sessionEquipments);
          notify(`${name} vinculado à empresa. A análise do histórico está em andamento.`);
        } catch (error) {
          console.error(`O equipamento foi vinculado, mas não foi possível enviar o JSON de ${name}:`, error);
          await onEquipmentAdded();
          notify(`${name} foi vinculado à empresa, mas o envio do JSON falhou.`);
          close();
          return;
        }
      } else {
        await onEquipmentAdded();
        notify(`${name} foi vinculado à empresa e aguarda a primeira leitura.`);
      }

      close();
      if (file) {
        analyzeUploadedHistory();
      }
    } catch (error) {
      console.error("Erro ao cadastrar equipamento:", error);
      notify(error instanceof Error ? error.message : "Não foi possível salvar o equipamento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" aria-label="Fechar" onClick={close} type="button" />
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <span className="summary-icon blue"><Icon name="snow" /></span>
            <div>
              <h2>Adicionar equipamento</h2>
              <p>{scope === "demo" ? "Cadastre um novo dispositivo IoT." : "Vincule o dispositivo já registrado pelo sensor à empresa."}</p>
            </div>
          </div>
          <Button variant="ghost" className="icon-button" label="Fechar" onClick={close}><Icon name="close" /></Button>
        </div>
        <div className="modal-form">
          <label>Nome do equipamento<input placeholder="Ex.: Freezer Sorvetes 03" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>MAC Address<input placeholder="AA:BB:CC:DD:EE:FF" value={serial} onChange={(event) => setSerial(event.target.value)} /></label>
          <label>Setor<select value={sector} onChange={(event) => setSector(event.target.value)}><option>Congelados</option><option>Açougue</option><option>Bebidas</option><option>Laticínios</option></select></label>
          {scope !== "demo" && (
            <label>
              Tensão de operação
              <select value={voltage} onChange={(event) => setVoltage(event.target.value === "127" ? 127 : 220)}>
                <option value={220}>220V</option>
                <option value={127}>127V</option>
              </select>
            </label>
          )}
          <div className="upload-wrapper">
            {/* Novo container para agrupar o ícone e o texto lado a lado */}
            <div className="upload-title-container">
              <img src={jsonIcon} alt="Ícone JSON" className="json-icon" />
              <span className="upload-title">Base de dados de telemetria (.json)</span>
            </div>
            
            <label className="custom-file-upload">
              <input type="file" accept=".json" onChange={handleFileChange} />
              {file ? <span>📄 {file.name}</span> : <span>📁 Clique para escolher o arquivo</span>}
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <Button onClick={close}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}><Icon name="plus" />Adicionar dispositivo</Button>
        </div>
      </div>
    </div>
  );
}
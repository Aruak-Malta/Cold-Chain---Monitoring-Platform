import { useState } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import jsonIcon from "../../assets/icons8-json-48.png";
import {
  analyzeSessionEquipment,
  getSessionId,
  parseSessionEquipmentList,
} from "../../services/sessionEquipmentService";
import type { SessionEquipmentRecord } from "../../services/sessionEquipmentService";

type AddEquipmentModalProps = {
  close: () => void;
  notify: (message: string) => void;
  onEquipmentAdded: (equipments: SessionEquipmentRecord[]) => void;
};

export function AddEquipmentModal({
  close,
  notify,
  onEquipmentAdded,
}: Readonly<AddEquipmentModalProps>) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [sector, setSector] = useState("Congelados");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }

  async function submit() {
    if (submitting) {
      return;
    }

    if (!name.trim() || !serial.trim()) {
      notify("Preencha o nome e o número de série.");
      return;
    }

    setSubmitting(true);
    notify(file ? `A processar o ficheiro ${file.name}...` : `Cadastrando ${name}...`);
    let equipmentRegistered = false;

    try {
      const formData = new FormData();
      formData.append("nome", name.trim());
      formData.append("serial", serial.trim());
      formData.append("setor", sector);
      if (file) {
        formData.append("file", file);
      }

      const resposta = await fetch("http://localhost:8000/equipamentos", {
        method: "POST",
        headers: { "X-Session-ID": getSessionId() },
        body: formData,
      });

      if (!resposta.ok) {
        notify(
          resposta.status === 409
            ? "Já existe um equipamento com esse número de série nesta sessão."
            : `Não foi possível cadastrar o equipamento (erro ${resposta.status}).`,
        );
        return;
      }

      let equipamentos = parseSessionEquipmentList(await resposta.json());
      equipmentRegistered = true;
      sessionStorage.setItem("equipamentos", JSON.stringify(equipamentos));
      onEquipmentAdded(equipamentos);
      if (file) {
        equipamentos = await analyzeSessionEquipment(serial.trim());
        onEquipmentAdded(equipamentos);
      }

      notify(
        file
          ? `${name} adicionado com sucesso e análises históricas processadas!`
          : `${name} foi adicionado e aguarda a primeira conexão.`,
      );
      close();
    } catch (error) {
      console.error("Erro ao cadastrar equipamento:", error);
      if (equipmentRegistered) {
        notify(`${name} foi cadastrado, mas não foi possível concluir a análise avançada.`);
        close();
      } else {
        notify("Falha ao comunicar com o servidor ou salvar os dados nesta sessão.");
      }
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
              <p>Cadastre um novo dispositivo IoT.</p>
            </div>
          </div>
          <Button variant="ghost" className="icon-button" label="Fechar" onClick={close}><Icon name="close" /></Button>
        </div>
        <div className="modal-form">
          <label>Nome do equipamento<input placeholder="Ex.: Freezer Sorvetes 03" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Número de série / MAC Address<input placeholder="AA:BB:CC:DD:EE:FF" value={serial} onChange={(event) => setSerial(event.target.value)} /></label>
          <label>Setor<select value={sector} onChange={(event) => setSector(event.target.value)}><option>Congelados</option><option>Açougue</option><option>Bebidas</option><option>Laticínios</option></select></label>
          <label>Tensão de operação<select><option>220V</option><option>127V</option></select></label>
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
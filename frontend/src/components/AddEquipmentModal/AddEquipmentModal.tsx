import { useState } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import jsonIcon from '../../assets/icons8-json-48.png';

type AddEquipmentModalProps = {
  close: () => void;
  notify: (message: string) => void;
};

export function AddEquipmentModal({ close, notify }: Readonly<AddEquipmentModalProps>) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }

async function submit() {
    if (!name || !serial) {
      notify("Preencha o nome e o número de série.");
      return;
    }

    // Se o utilizador anexou um ficheiro, enviamos para o Python
    if (file) {
      notify(`A processar o ficheiro ${file.name}...`);
      
      const formData = new FormData();
      formData.append("file", file);

      try {
        // Bate na porta do seu backend Python
        const resposta = await fetch("http://localhost:8000/analisar-equipamento", {
          method: "POST",
          body: formData,
        });

        if (resposta.ok) {
          const dadosCalculados = await resposta.json();
          // Imprime o resultado no F12 (Console) para podermos ver a magia a acontecer!
          console.log("Resposta do Python recebida:", dadosCalculados); 
          notify(`${name} adicionado com sucesso e dados históricos processados!`);
        } else {
          notify(`Erro ao analisar ficheiro: o servidor recusou os dados.`);
        }
      } catch (error) {
        console.error("Erro de comunicação:", error);
        notify("Falha ao contactar o servidor Python. Verifique se ele está a correr.");
      }
    } else {
      // Caso normal: Adiciona o equipamento sem base de dados histórica
      notify(`${name} foi adicionado e aguarda a primeira conexão.`);
    }

    close();
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
          <label>Setor<select><option>Congelados</option><option>Açougue</option><option>Bebidas</option><option>Laticínios</option></select></label>
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
          <Button variant="primary" onClick={submit}><Icon name="plus" />Adicionar dispositivo</Button>
        </div>
      </div>
    </div>
  );
}
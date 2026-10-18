import json

import pandas as pd
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
equipamentos_por_sessao: dict[str, dict[str, dict]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def analisar_conteudo_json(conteudo: bytes) -> dict:
    dados_json = json.loads(conteudo)
    if not isinstance(dados_json, (list, dict)):
        raise ValueError("O JSON precisa conter uma lista ou um objeto.")

    registros = dados_json if isinstance(dados_json, list) else [dados_json]
    df = pd.DataFrame(registros)
    resumo = {
        "temperatura_media": df["temperatura"].mean() if "temperatura" in df else 0,
        "umidade_media": df["umidade"].mean() if "umidade" in df else 0,
        "corrente_maxima": df["corrente"].max() if "corrente" in df else 0,
        "total_leituras": len(df),
    }
    dados_grafico = {
        "tempos": df["timestamp"].tolist() if "timestamp" in df else [],
        "temperaturas": df["temperatura"].tolist() if "temperatura" in df else [],
        "umidades": df["umidade"].tolist() if "umidade" in df else [],
        "correntes": df["corrente"].tolist() if "corrente" in df else [],
    }
    return {
        "mensagem": "Ficheiro processado com sucesso!",
        "resumo_analise": resumo,
        "dados_graficos": dados_grafico,
    }


def converter_erro_json(error: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=f"JSON inválido: {error}")


@app.post("/analisar-equipamento")
async def analisar_dados_json(file: UploadFile = File(...)):
    try:
        return analisar_conteudo_json(await file.read())
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        raise converter_erro_json(error) from error


@app.post("/equipamentos")
async def cadastrar_equipamento(
    nome: str = Form(...),
    serial: str = Form(...),
    setor: str = Form("Sem setor"),
    session_id: str = Header(..., alias="X-Session-ID", min_length=1, max_length=128),
    file: UploadFile | None = File(default=None),
):
    nome = nome.strip()
    serial = serial.strip()
    setor = setor.strip() or "Sem setor"
    if not nome or not serial:
        raise HTTPException(status_code=422, detail="Nome e número de série são obrigatórios.")

    equipamentos = equipamentos_por_sessao.setdefault(session_id, {})
    chave_serial = serial.casefold()
    if chave_serial in equipamentos:
        raise HTTPException(
            status_code=409,
            detail="Já existe um equipamento com esse número de série nesta sessão.",
        )

    telemetria = None
    if file is not None:
        try:
            telemetria = analisar_conteudo_json(await file.read())
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            raise converter_erro_json(error) from error

    equipamentos[chave_serial] = {
        "nome": nome,
        "serial": serial,
        "setor": setor,
        "telemetria": telemetria,
    }
    return {"equipamentos": list(equipamentos.values())}


@app.get("/equipamentos")
async def listar_equipamentos(
    session_id: str = Header(..., alias="X-Session-ID", min_length=1, max_length=128),
):
    equipamentos = equipamentos_por_sessao.get(session_id, {})
    return {"equipamentos": list(equipamentos.values())}

import json
import math

import pandas as pd
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from analises.basica import processar_telemetria_basica
from analises.comum import serie_numerica
from analises.termica import analisar_comportamento_termico
from analises.eletrica import analisar_comportamento_eletrico
from analises.saude import calcular_health_score

app = FastAPI()
equipamentos_por_sessao: dict[str, dict[str, dict[str, object]]] = {}
dados_brutos_por_sessao: dict[str, dict[str, list[dict[str, object]]]] = {}


class SolicitacaoAnalise(BaseModel):
    serial: str = Field(min_length=1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def converter_erro_json(error: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=f"JSON inválido: {error}")

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

    chave_serial = serial.casefold()
    equipamentos = equipamentos_por_sessao.get(session_id, {})
    if chave_serial in equipamentos:
        raise HTTPException(
            status_code=409,
            detail="Já existe um equipamento com esse número de série nesta sessão.",
        )

    telemetria = None
    registros: list[dict[str, object]] | None = None
    if file is not None:
        try:
            conteudo = await file.read()
            dados_json = json.loads(conteudo)
            if not isinstance(dados_json, (list, dict)):
                raise ValueError("O JSON precisa conter uma lista ou um objeto.")

            registros = dados_json if isinstance(dados_json, list) else [dados_json]
            if not all(isinstance(registro, dict) for registro in registros):
                raise ValueError("Cada leitura do JSON precisa ser um objeto.")

            df = pd.DataFrame(registros)
            telemetria = processar_telemetria_basica(df)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            raise converter_erro_json(error) from error

    equipamento: dict[str, object] = {
        "nome": nome,
        "serial": serial,
        "setor": setor,
        "telemetria": telemetria,
        "analise_avancada": None,
    }
    equipamentos = equipamentos_por_sessao.setdefault(session_id, {})
    equipamentos[chave_serial] = equipamento
    if registros is not None:
        dados_brutos_por_sessao.setdefault(session_id, {})[chave_serial] = registros

    return {"equipamentos": list(equipamentos.values())}

@app.get("/equipamentos")
async def listar_equipamentos(
    session_id: str = Header(..., alias="X-Session-ID", min_length=1, max_length=128),
):
    equipamentos = equipamentos_por_sessao.get(session_id, {})
    return {"equipamentos": list(equipamentos.values())}


@app.get("/resumo")
async def obter_resumo(
    session_id: str = Header(..., alias="X-Session-ID", min_length=1, max_length=128),
):
    equipamentos = equipamentos_por_sessao.get(session_id, {})
    registros_brutos = dados_brutos_por_sessao.get(session_id, {})
    temperaturas: list[float] = []
    total_leituras = 0
    analises_concluidas = 0
    alertas = 0
    health_scores: list[float] = []
    duty_cycles: list[float] = []

    for chave_serial, equipamento in equipamentos.items():
        telemetria = equipamento.get("telemetria")
        if isinstance(telemetria, dict):
            resumo = telemetria.get("resumo_analise")
            if isinstance(resumo, dict):
                total_leituras += int(resumo.get("total_leituras", 0))

        analise = equipamento.get("analise_avancada")
        if isinstance(analise, dict):
            analises_concluidas += 1
            saude = analise.get("saude")
            if isinstance(saude, dict):
                if saude.get("status_geral") in {"Atenção", "Crítico"}:
                    alertas += 1
                health_score = saude.get("health_score")
                if isinstance(health_score, (int, float)) and math.isfinite(health_score):
                    health_scores.append(float(health_score))

            eletrica = analise.get("eletrica")
            if isinstance(eletrica, dict):
                duty_cycle = eletrica.get("duty_cycle_percentual")
                if isinstance(duty_cycle, (int, float)) and math.isfinite(duty_cycle):
                    duty_cycles.append(float(duty_cycle))

        leituras = registros_brutos.get(chave_serial, [])
        if leituras:
            df = pd.DataFrame(leituras)
            if "temperatura" in df.columns:
                valores = serie_numerica(df["temperatura"]).dropna()
                temperaturas.extend(float(valor) for valor in valores if math.isfinite(float(valor)))

    return {
        "resumo": {
            "total_equipamentos": len(equipamentos),
            "total_leituras": total_leituras,
            "analises_concluidas": analises_concluidas,
            "alertas": alertas,
            "health_score_medio": (
                round(sum(health_scores) / len(health_scores), 1) if health_scores else None
            ),
            "riscos_criticos": sum(
                1
                for equipamento in equipamentos.values()
                if isinstance(equipamento.get("analise_avancada"), dict)
                and isinstance(equipamento["analise_avancada"].get("saude"), dict)
                and equipamento["analise_avancada"]["saude"].get("status_geral") == "Crítico"
            ),
            "duty_cycle_medio": (
                round(sum(duty_cycles) / len(duty_cycles), 1) if duty_cycles else None
            ),
            "temperatura_media": (
                round(sum(temperaturas) / len(temperaturas), 2) if temperaturas else None
            ),
        }
    }


@app.post("/analise-avancada")
async def executar_analise_avancada(
    solicitacao: SolicitacaoAnalise,
    session_id: str = Header(..., alias="X-Session-ID", min_length=1, max_length=128),
):
    chave_serial = solicitacao.serial.strip().casefold()
    if not chave_serial:
        raise HTTPException(status_code=422, detail="O número de série é obrigatório.")

    equipamentos = equipamentos_por_sessao.get(session_id, {})
    equipamento = equipamentos.get(chave_serial)
    if equipamento is None:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado nesta sessão.")

    dados_brutos = dados_brutos_por_sessao.get(session_id, {})
    if chave_serial not in dados_brutos:
        raise HTTPException(status_code=422, detail="O equipamento não possui telemetria JSON.")

    df = pd.DataFrame(dados_brutos[chave_serial])
    laudo_termico = analisar_comportamento_termico(df)
    laudo_eletrico = analisar_comportamento_eletrico(df)
    laudo_saude = calcular_health_score(laudo_termico, laudo_eletrico)
    analise_avancada = {
        "termica": laudo_termico or None,
        "eletrica": laudo_eletrico or None,
        "saude": laudo_saude,
    }
    equipamento["analise_avancada"] = analise_avancada

    return {"equipamentos": list(equipamentos.values())}
import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path


INTERVALO_MINUTOS = 5
DIAS_POR_BASE = 30
LEITURAS_POR_DIA = 24 * 60 // INTERVALO_MINUTOS
TOTAL_LEITURAS = DIAS_POR_BASE * LEITURAS_POR_DIA

BASES = {
    "01_temperatura_alta": {
        "seed": 101,
        "anomalias": "Temperatura alta persistente",
    },
    "02_temperatura_baixa": {
        "seed": 202,
        "anomalias": "Temperatura baixa persistente",
    },
    "03_corrente_e_refrigeracao": {
        "seed": 303,
        "anomalias": "Corrente alta sustentada e refrigeração possivelmente ineficiente",
    },
    "04_duty_cycle_elevado": {
        "seed": 404,
        "anomalias": "Duty cycle elevado",
    },
    "05_qualidade_da_telemetria": {
        "seed": 505,
        "anomalias": "Lacuna temporal e leituras de sensores inválidas/ausentes",
    },
}


def gerar_registros(
    tipo_base: str,
    agora: datetime | None = None,
) -> list[dict[str, object]]:
    if tipo_base not in BASES:
        raise ValueError(f"Tipo de base desconhecido: {tipo_base}")

    instante_final = agora or datetime.now(timezone.utc)
    if instante_final.tzinfo is None:
        instante_final = instante_final.replace(tzinfo=timezone.utc)
    instante_final = instante_final.replace(second=0, microsecond=0)
    primeiro_timestamp = instante_final - timedelta(days=DIAS_POR_BASE)
    gerador = random.Random(BASES[tipo_base]["seed"])
    registros: list[dict[str, object]] = []

    for indice in range(TOTAL_LEITURAS):
        timestamp = primeiro_timestamp + timedelta(minutes=INTERVALO_MINUTOS * indice)
        temperatura = (
            4
            + 1.5 * math.sin(2 * math.pi * (indice % LEITURAS_POR_DIA) / LEITURAS_POR_DIA)
            + gerador.uniform(-0.15, 0.15)
        )

        if tipo_base == "01_temperatura_alta" and 3600 <= indice < 3660:
            temperatura = 9 + gerador.uniform(-0.2, 0.2)
        elif tipo_base == "02_temperatura_baixa" and 4800 <= indice < 4860:
            temperatura = -2 + gerador.uniform(-0.2, 0.2)

        if tipo_base == "04_duty_cycle_elevado":
            compressor_ligado = indice % 10 < 8
        else:
            compressor_ligado = indice % 120 < 48

        iniciou_compressor = compressor_ligado and (
            indice == 0
            or (
                tipo_base == "04_duty_cycle_elevado"
                and (indice - 1) % 10 >= 8
            )
            or (
                tipo_base != "04_duty_cycle_elevado"
                and (indice - 1) % 120 >= 48
            )
        )

        corrente = (
            gerador.uniform(5.4, 6.2)
            if compressor_ligado
            else 0.0
        )
        if iniciou_compressor:
            corrente = gerador.uniform(15, 18)

        if tipo_base == "03_corrente_e_refrigeracao" and 6000 <= indice < 6090:
            corrente = gerador.uniform(13.5, 14.5)
            temperatura = 4 + gerador.uniform(-0.2, 0.2)

        registro: dict[str, object] = {
            "timestamp": timestamp.isoformat(),
            "temperatura": round(temperatura, 2),
            "umidade": round(55 + 8 * (temperatura < 4) + gerador.uniform(-1, 1), 2),
            "corrente": round(corrente, 2),
        }

        if tipo_base == "05_qualidade_da_telemetria":
            if indice in {900, 2400}:
                registro["temperatura"] = None
            if indice == 1500:
                registro["corrente"] = -1.0

        if tipo_base != "05_qualidade_da_telemetria" or not 3000 <= indice < 3018:
            registros.append(registro)

    return registros


def gerar_bases(diretorio_saida: Path | None = None) -> list[Path]:
    pasta_saida = diretorio_saida or Path(__file__).resolve().parent / "bases_teste"
    pasta_saida.mkdir(parents=True, exist_ok=True)
    arquivos: list[Path] = []

    for nome, configuracao in BASES.items():
        registros = gerar_registros(nome)
        caminho = pasta_saida / f"{nome}.json"
        with caminho.open("w", encoding="utf-8") as arquivo:
            json.dump(registros, arquivo, ensure_ascii=False, indent=2)
        arquivos.append(caminho)
        print(
            f"{caminho.name}: {len(registros)} leituras em {DIAS_POR_BASE} dias; "
            f"anomalias: {configuracao['anomalias']}"
        )

    return arquivos


if __name__ == "__main__":
    gerar_bases()

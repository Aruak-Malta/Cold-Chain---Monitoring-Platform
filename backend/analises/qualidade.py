from datetime import datetime, timezone

import pandas as pd

from analises.comum import serie_numerica, serie_temporal


def analisar_qualidade_telemetria(
    df: pd.DataFrame,
    agora: datetime | None = None,
) -> dict:
    total_leituras = len(df)
    resultado = {
        "total_leituras": total_leituras,
        "timestamps_invalidos": total_leituras,
        "timestamps_duplicados": 0,
        "ultima_leitura": None,
        "intervalo_mediano_minutos": None,
        "maior_intervalo_minutos": None,
        "lacunas_temporais": 0,
        "telemetria_desatualizada": False,
        "leituras_temperatura_sem_valor": total_leituras,
        "temperaturas_fora_faixa_sensor": 0,
        "leituras_corrente_sem_valor": total_leituras,
        "correntes_fora_faixa_sensor": 0,
        "leituras_incompletas": total_leituras,
        "campos_essenciais_ausentes": [],
    }
    if total_leituras == 0:
        resultado["campos_essenciais_ausentes"] = ["temperatura", "corrente", "timestamp"]
        return resultado

    for campo in ("temperatura", "corrente"):
        if campo not in df.columns:
            resultado["campos_essenciais_ausentes"].append(campo)
            continue

        valores = serie_numerica(df[campo])
        leituras_sem_valor = int(valores.isna().sum())
        resultado[f"leituras_{campo}_sem_valor"] = leituras_sem_valor
        limite_inferior, limite_superior = (-80, 80) if campo == "temperatura" else (0, 100)
        fora_faixa = (valores < limite_inferior) | (valores > limite_superior)
        resultado[
            "temperaturas_fora_faixa_sensor" if campo == "temperatura" else "correntes_fora_faixa_sensor"
        ] = int(fora_faixa.sum())

    if "temperatura" not in df.columns or "corrente" not in df.columns:
        resultado["leituras_incompletas"] = total_leituras
    else:
        temperaturas = serie_numerica(df["temperatura"])
        correntes = serie_numerica(df["corrente"])
        temperatura_valida = temperaturas.between(-80, 80)
        corrente_valida = correntes.between(0, 100)
        resultado["leituras_incompletas"] = int((~(temperatura_valida & corrente_valida)).sum())

    if "timestamp" not in df.columns:
        resultado["campos_essenciais_ausentes"].append("timestamp")
        return resultado

    timestamps = serie_temporal(df["timestamp"])
    validos = timestamps.dropna().sort_values(kind="stable")
    resultado["timestamps_invalidos"] = int(timestamps.isna().sum())
    resultado["timestamps_duplicados"] = int(validos.duplicated().sum())
    if validos.empty:
        return resultado

    mais_recente = validos.iloc[-1]
    resultado["ultima_leitura"] = mais_recente.isoformat()
    intervalos = validos.drop_duplicates().diff().dt.total_seconds().dropna() / 60
    intervalos_positivos = intervalos[intervalos > 0]
    limite_lacuna = 15.0
    if not intervalos_positivos.empty:
        intervalo_mediano = float(intervalos_positivos.median())
        maior_intervalo = float(intervalos_positivos.max())
        limite_lacuna = max(intervalo_mediano * 3, 15)
        resultado["intervalo_mediano_minutos"] = round(intervalo_mediano, 1)
        resultado["maior_intervalo_minutos"] = round(maior_intervalo, 1)
        resultado["lacunas_temporais"] = int((intervalos_positivos > limite_lacuna).sum())

    instante_atual = agora or datetime.now(timezone.utc)
    if instante_atual.tzinfo is None:
        instante_atual = instante_atual.replace(tzinfo=timezone.utc)
    minutos_desde_leitura = (instante_atual - mais_recente.to_pydatetime()).total_seconds() / 60
    resultado["telemetria_desatualizada"] = minutos_desde_leitura > limite_lacuna
    return resultado

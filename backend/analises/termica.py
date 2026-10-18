import pandas as pd
import numpy as np

from analises.comum import serie_numerica, serie_temporal


def analisar_comportamento_termico(df: pd.DataFrame) -> dict:
    if "temperatura" not in df.columns:
        return {}

    temperaturas = serie_numerica(df["temperatura"]).dropna()
    temperaturas = temperaturas[np.isfinite(temperaturas)]
    if len(temperaturas) < 30: # Exige um mínimo de dados para ter precisão estatística
        return {}

    timestamps_validos = False
    if "timestamp" in df.columns:
        dados = pd.DataFrame({
            "temperatura": serie_numerica(df["temperatura"]),
            "timestamp": serie_temporal(df["timestamp"]),
        }).dropna(subset=["temperatura"])
        dados = dados[np.isfinite(dados["temperatura"])]
        if dados["timestamp"].notna().all() and dados["timestamp"].nunique() > 1:
            dados = dados.sort_values("timestamp", kind="stable")
            temperaturas = dados["temperatura"]
            timestamps = dados["timestamp"]
            horas = (timestamps - timestamps.iloc[0]).dt.total_seconds().to_numpy() / 3600
            intervalos = np.diff(horas)
            intervalos_positivos = intervalos[intervalos > 0]
            if len(intervalos_positivos):
                pesos_tempo = np.append(intervalos, np.median(intervalos_positivos))
                timestamps_validos = float(pesos_tempo.sum()) > 0

    # 1. SUAVIZAÇÃO DE RUÍDO (Rolling Mean)
    temp_suavizada = temperaturas.rolling(window=5, min_periods=1).mean()

    setpoint = float(temp_suavizada.median())
    q1 = temp_suavizada.quantile(0.25)
    q3 = temp_suavizada.quantile(0.75)
    iqr = float(q3 - q1)
    limite_critico = setpoint + (1.5 * iqr)

    is_high = temp_suavizada > limite_critico
    y = temp_suavizada.to_numpy(dtype=float)
    if timestamps_validos:
        x = horas
        pesos = np.sqrt(pesos_tempo)
        percentual_risco = float(np.average(is_high.to_numpy(dtype=float), weights=pesos_tempo) * 100)
    else:
        x = np.arange(len(temp_suavizada), dtype=float)
        pesos = None
        percentual_risco = float(is_high.mean() * 100)

    slope, _ = np.polyfit(x, y, 1, w=pesos)
    duracao = float(x[-1] - x[0]) if len(x) > 1 else 0.0
    aquecimento_projetado = float(slope * duracao)
    alerta_preditivo = bool(aquecimento_projetado > (iqr * 0.5) and slope > 0)

    return {
        "setpoint_aprendido": round(setpoint, 2),
        "oscilacao_natural_iqr": round(iqr, 2),
        "limite_critico_calculado": round(limite_critico, 2),
        "percentual_tempo_em_risco": round(percentual_risco, 2),
        "tendencia_aquecimento_graus": round(aquecimento_projetado, 3),
        "base_temporal": "timestamps" if timestamps_validos else "leituras",
        "falha_preditiva_detectada": alerta_preditivo
    }
import pandas as pd
import math

from analises.comum import serie_numerica


def analisar_comportamento_eletrico(df: pd.DataFrame, tensao_rede: int = 220) -> dict:
    if "corrente" not in df.columns:
        return {}

    correntes = serie_numerica(df["corrente"]).dropna()
    correntes = correntes[correntes.map(math.isfinite)]
    if len(correntes) < 30:
        return {}

    corrente_maxima = float(correntes.max())
    corrente_standby = float(correntes.min())
    limiar_funcionamento = corrente_standby + ((corrente_maxima - corrente_standby) * 0.15)
    estado_ligado = correntes > limiar_funcionamento

    duty_cycle = float((estado_ligado.sum() / len(correntes)) * 100)
    corrente_media_ativa = float(correntes[estado_ligado].mean()) if estado_ligado.sum() > 0 else 0.0

    fator_potencia = 0.85
    potencia_ativa_watts = corrente_media_ativa * tensao_rede * fator_potencia

    partidas_observadas = int(
        ((~estado_ligado.iloc[:-1].to_numpy()) & estado_ligado.iloc[1:].to_numpy()).sum()
    )

    alerta_esforco_critico = bool(duty_cycle > 75.0)
    alerta_compressor_travando = bool(corrente_media_ativa > (corrente_maxima * 0.80))

    return {
        "corrente_pico_partida": round(corrente_maxima, 2),
        "corrente_trabalho_media": round(corrente_media_ativa, 2),
        "duty_cycle_percentual": round(duty_cycle, 1),
        "potencia_estimada_watts": round(potencia_ativa_watts, 2),
        "partidas_observadas": partidas_observadas,
        "alerta_esforco_critico": alerta_esforco_critico,
        "alerta_compressor_travando": alerta_compressor_travando
    }
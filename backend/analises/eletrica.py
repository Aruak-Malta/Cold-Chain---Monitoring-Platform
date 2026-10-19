import pandas as pd
import math
import numpy as np

from analises.comum import maior_sequencia_persistente, serie_numerica, serie_temporal


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
    correntes_ativas = correntes[estado_ligado]
    mediana_ativa = float(correntes_ativas.median()) if not correntes_ativas.empty else 0.0
    desvio_absoluto_mediano = (
        float((correntes_ativas - mediana_ativa).abs().median())
        if not correntes_ativas.empty
        else 0.0
    )
    limite_corrente_sustentada = mediana_ativa + max(
        3 * 1.4826 * desvio_absoluto_mediano,
        (corrente_maxima - corrente_standby) * 0.15,
    )
    corrente_alta = correntes > limite_corrente_sustentada
    timestamps_serie = None
    if "timestamp" in df.columns:
        timestamps_serie = serie_temporal(df.loc[correntes.index, "timestamp"]).reset_index(drop=True)
    leituras_corrente_alta, duracao_corrente_alta, inicio_corrente_alta, fim_corrente_alta, timestamps_validos = (
        maior_sequencia_persistente(corrente_alta.reset_index(drop=True), timestamps_serie)
    )
    alerta_corrente_alta_sustentada = leituras_corrente_alta >= 3 and (
        not timestamps_validos or duracao_corrente_alta >= 10
    )

    alerta_refrigeracao_ineficiente = False
    if (
        alerta_corrente_alta_sustentada
        and inicio_corrente_alta >= 0
        and fim_corrente_alta > inicio_corrente_alta
        and "temperatura" in df.columns
    ):
        temperaturas = serie_numerica(df.loc[correntes.index, "temperatura"]).reset_index(drop=True)
        temperaturas_trecho = temperaturas.iloc[inicio_corrente_alta:fim_corrente_alta + 1]
        temperaturas_validas = temperaturas_trecho.dropna()
        if len(temperaturas_validas) >= 3:
            if timestamps_validos and timestamps_serie is not None:
                tempos_evento = timestamps_serie.iloc[inicio_corrente_alta:fim_corrente_alta + 1]
                tempos_evento = tempos_evento[temperaturas_trecho.notna().to_numpy()]
                x = (tempos_evento - tempos_evento.iloc[0]).dt.total_seconds().to_numpy() / 3600
            else:
                x = np.arange(len(temperaturas_validas), dtype=float)
            y = temperaturas_validas.to_numpy(dtype=float)
            queda_projetada = -float(np.polyfit(x, y, 1)[0]) * (x[-1] - x[0])
            alerta_refrigeracao_ineficiente = bool(queda_projetada < 0.5)

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
        "limite_corrente_alta_sustentada": round(limite_corrente_sustentada, 2),
        "leituras_consecutivas_corrente_alta": leituras_corrente_alta,
        "duracao_corrente_alta_minutos": round(duracao_corrente_alta, 1),
        "potencia_estimada_watts": round(potencia_ativa_watts, 2),
        "partidas_observadas": partidas_observadas,
        "alerta_esforco_critico": alerta_esforco_critico,
        "alerta_compressor_travando": alerta_compressor_travando,
        "alerta_corrente_alta_sustentada": alerta_corrente_alta_sustentada,
        "alerta_refrigeracao_ineficiente": alerta_refrigeracao_ineficiente,
    }
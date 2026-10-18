import math

import numpy as np
import pandas as pd

from analises.comum import serie_numerica


def _numeric_values(df: pd.DataFrame, column: str) -> list[float | None]:
    if column not in df.columns:
        return [None] * len(df)

    return _serialize_numeric(serie_numerica(df[column]))


def _serialize_numeric(values: pd.Series) -> list[float | None]:
    return [
        float(value) if pd.notna(value) and math.isfinite(float(value)) else None
        for value in values
    ]


def _average(df: pd.DataFrame, column: str) -> float | None:
    values = serie_numerica(df[column]) if column in df.columns else pd.Series(dtype=float)
    values = values[values.map(lambda value: pd.notna(value) and math.isfinite(float(value)))]
    return float(values.mean()) if not values.empty else None


def _maximum(df: pd.DataFrame, column: str) -> float | None:
    values = serie_numerica(df[column]) if column in df.columns else pd.Series(dtype=float)
    values = values[values.map(lambda value: pd.notna(value) and math.isfinite(float(value)))]
    return float(values.max()) if not values.empty else None


def suavizar_serie(values: pd.Series) -> pd.Series:
    numeric_values = serie_numerica(values)
    valid_count = int(numeric_values.notna().sum())
    if valid_count < 3:
        return numeric_values

    window = min(31, max(3, int(np.sqrt(valid_count))))
    if window % 2 == 0:
        window += 1

    robust_values = numeric_values.rolling(window, center=True, min_periods=1).median()
    smooth_values = robust_values.rolling(window, center=True, min_periods=1).mean()
    return smooth_values.where(numeric_values.notna())


def processar_telemetria_basica(df: pd.DataFrame) -> dict:
    total_leituras = len(df)

    # Downsampling para o gráfico do frontend não travar o navegador
    if total_leituras > 100:
        indices = np.linspace(0, total_leituras - 1, num=100, dtype=int)
    else:
        indices = np.arange(total_leituras)
    df_grafico = df.iloc[indices].copy()

    temperatura_media = _average(df, "temperatura")
    umidade_media = _average(df, "umidade")
    corrente_maxima = _maximum(df, "corrente")
    series_suavizadas = {
        coluna: suavizar_serie(df[coluna]) if coluna in df.columns else pd.Series([None] * total_leituras)
        for coluna in ("temperatura", "umidade", "corrente")
    }
    tempos = (
        [None if pd.isna(value) else str(value) for value in df_grafico["timestamp"]]
        if "timestamp" in df_grafico.columns
        else [None] * len(df_grafico)
    )

    return {
        "resumo_analise": {
            "temperatura_media": round(temperatura_media, 2) if temperatura_media is not None else None,
            "umidade_media": round(umidade_media, 2) if umidade_media is not None else None,
            "corrente_maxima": round(corrente_maxima, 2) if corrente_maxima is not None else None,
            "total_leituras": total_leituras
        },
        "dados_graficos": {
            "tempos": tempos,
            "temperaturas": _numeric_values(df_grafico, "temperatura"),
            "temperaturas_suavizadas": _serialize_numeric(series_suavizadas["temperatura"].iloc[indices]),
            "umidades": _numeric_values(df_grafico, "umidade"),
            "umidades_suavizadas": _serialize_numeric(series_suavizadas["umidade"].iloc[indices]),
            "correntes": _numeric_values(df_grafico, "corrente"),
            "correntes_suavizadas": _serialize_numeric(series_suavizadas["corrente"].iloc[indices]),
        }
    }
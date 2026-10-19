import math

import pandas as pd


def serie_numerica(values: pd.Series) -> pd.Series:
    def converter(value: object) -> float:
        if value is None or isinstance(value, (dict, list)):
            return float("nan")

        try:
            numero = float(value)
        except (TypeError, ValueError, OverflowError):
            return float("nan")
        return numero if math.isfinite(numero) else float("nan")

    return pd.Series(
        (converter(value) for value in values),
        index=values.index,
        dtype="float64",
    )


def serie_temporal(values: pd.Series) -> pd.Series:
    def converter(value: object):
        if not isinstance(value, str) or not value.strip():
            return pd.NaT

        try:
            return pd.to_datetime(value, errors="coerce", utc=True)
        except (TypeError, ValueError, OverflowError):
            return pd.NaT

    return pd.to_datetime(
        pd.Series((converter(value) for value in values), index=values.index),
        errors="coerce",
        utc=True,
    )


def maior_sequencia_persistente(
    condicao: pd.Series,
    timestamps: pd.Series | None = None,
) -> tuple[int, float, int, int, bool]:
    flags = condicao.fillna(False).astype(bool).reset_index(drop=True).to_numpy()
    times = timestamps.reset_index(drop=True) if timestamps is not None else None
    timestamps_validos = (
        times is not None
        and times.notna().all()
        and times.nunique() > 1
    )

    intervalo_maximo_minutos = float("inf")
    if timestamps_validos and times is not None:
        intervalos = times.diff().dt.total_seconds().dropna() / 60
        intervalos_positivos = intervalos[intervalos > 0]
        if not intervalos_positivos.empty:
            intervalo_maximo_minutos = max(float(intervalos_positivos.median()) * 3, 15)

    maior_contagem = 0
    maior_duracao = 0.0
    maior_inicio = -1
    maior_fim = -1
    inicio_atual = -1
    contagem_atual = 0

    for indice, ativo in enumerate(flags):
        if not ativo:
            inicio_atual = -1
            contagem_atual = 0
            continue

        if inicio_atual >= 0 and timestamps_validos and times is not None:
            intervalo = (times.iloc[indice] - times.iloc[indice - 1]).total_seconds() / 60
            if intervalo <= 0 or intervalo > intervalo_maximo_minutos:
                inicio_atual = -1
                contagem_atual = 0

        if inicio_atual < 0:
            inicio_atual = indice
            contagem_atual = 0
        contagem_atual += 1

        duracao_atual = 0.0
        if timestamps_validos and times is not None:
            duracao_atual = max(
                0.0,
                (times.iloc[indice] - times.iloc[inicio_atual]).total_seconds() / 60,
            )

        if contagem_atual > maior_contagem or (
            contagem_atual == maior_contagem and duracao_atual > maior_duracao
        ):
            maior_contagem = contagem_atual
            maior_duracao = duracao_atual
            maior_inicio = inicio_atual
            maior_fim = indice

    return maior_contagem, maior_duracao, maior_inicio, maior_fim, bool(timestamps_validos)

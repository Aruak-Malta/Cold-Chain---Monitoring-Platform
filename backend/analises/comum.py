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

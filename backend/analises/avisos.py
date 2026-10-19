def gerar_avisos(
    termica: dict | None,
    eletrica: dict | None,
    qualidade: dict,
) -> list[dict[str, str]]:
    avisos: list[dict[str, str]] = []

    def adicionar(codigo: str, nivel: str, titulo: str, detalhe: str, valor: str) -> None:
        avisos.append({
            "codigo": codigo,
            "nivel": nivel,
            "titulo": titulo,
            "detalhe": detalhe,
            "valor": valor,
        })

    if termica:
        if termica.get("alerta_temperatura_anomala_baixa"):
            duracao = termica.get("duracao_anomalia_baixa_minutos", 0)
            adicionar(
                "temperatura_baixa_relativa",
                "warning",
                "Temperatura abaixo do padrão observado",
                "A temperatura permaneceu abaixo da faixa estatística aprendida para este equipamento.",
                f"Limite relativo {termica['limite_inferior_relativo']} °C · {duracao} min",
            )
        if termica.get("alerta_temperatura_anomala_alta"):
            duracao = termica.get("duracao_anomalia_alta_minutos", 0)
            adicionar(
                "temperatura_alta_relativa",
                "warning",
                "Temperatura acima do padrão observado",
                "A temperatura permaneceu acima da faixa estatística aprendida para este equipamento.",
                f"Limite relativo {termica['limite_critico_calculado']} °C · {duracao} min",
            )
        if termica.get("falha_preditiva_detectada"):
            adicionar(
                "tendencia_aquecimento",
                "warning",
                "Tendência de aquecimento",
                "A tendência térmica observada projeta aquecimento sustentado.",
                f"{termica['tendencia_aquecimento_graus']} °C projetados",
            )
        risco = termica.get("percentual_tempo_em_risco", 0)
        if risco > 2:
            adicionar(
                "risco_termico",
                "critical" if risco > 10 else "warning",
                "Exposição térmica elevada",
                "Parte das leituras excedeu o limite superior relativo calculado para o equipamento.",
                f"{risco}% do período em risco",
            )

    if eletrica:
        if eletrica.get("alerta_compressor_travando"):
            adicionar(
                "compressor_travando",
                "critical",
                "Possível falha no compressor",
                "A corrente média de operação está muito próxima do pico medido.",
                f"Média {eletrica['corrente_trabalho_media']} A · pico {eletrica['corrente_pico_partida']} A",
            )
        if eletrica.get("alerta_corrente_alta_sustentada"):
            duracao = eletrica.get("duracao_corrente_alta_minutos", 0)
            adicionar(
                "corrente_alta_sustentada",
                "critical" if duracao >= 60 else "warning",
                "Corrente alta sustentada",
                "A corrente permaneceu acima do padrão robusto de operação; picos isolados de partida são desconsiderados.",
                f"Limite aprendido {eletrica['limite_corrente_alta_sustentada']} A · {duracao} min",
            )
        if eletrica.get("alerta_refrigeracao_ineficiente"):
            duracao = eletrica.get("duracao_corrente_alta_minutos", 0)
            adicionar(
                "refrigeracao_ineficiente",
                "critical" if duracao >= 60 else "warning",
                "Refrigeração possivelmente ineficiente",
                "Durante a corrente elevada sustentada, a temperatura não apresentou queda significativa.",
                f"Corrente alta por {duracao} min sem resposta térmica clara",
            )
        if eletrica.get("alerta_esforco_critico"):
            adicionar(
                "esforco_eletrico",
                "warning",
                "Ciclo de operação elevado",
                "O compressor permaneceu ligado por mais de 75% das leituras.",
                f"Duty cycle {eletrica['duty_cycle_percentual']}%",
            )
        if eletrica.get("duty_cycle_percentual", 100) < 10:
            adicionar(
                "duty_cycle_baixo",
                "warning",
                "Ciclo de operação muito baixo",
                "Pode indicar baixa demanda, equipamento subutilizado ou falha de leitura do sensor.",
                f"Duty cycle {eletrica['duty_cycle_percentual']}%",
            )

    if qualidade.get("total_leituras", 0) > 0:
        ultima_leitura = qualidade.get("ultima_leitura")
        if qualidade.get("telemetria_desatualizada") and ultima_leitura:
            adicionar(
                "telemetria_desatualizada",
                "warning",
                "Telemetria desatualizada",
                f"A última leitura válida foi registrada em {ultima_leitura}.",
                f"Última leitura: {ultima_leitura}",
            )
        if qualidade.get("lacunas_temporais", 0) > 0:
            adicionar(
                "lacunas_telemetria",
                "warning",
                "Lacunas no histórico de leituras",
                "Foram encontrados intervalos maiores que três cadências típicas entre leituras.",
                f"{qualidade['lacunas_temporais']} lacuna(s) · maior intervalo {qualidade['maior_intervalo_minutos']} min",
            )
        if qualidade.get("timestamps_invalidos", 0) > 0:
            adicionar(
                "timestamps_invalidos",
                "warning",
                "Horários ausentes ou inválidos",
                "Parte das leituras não pode ser posicionada no tempo.",
                f"{qualidade['timestamps_invalidos']} leitura(s) sem horário válido",
            )
        if qualidade.get("timestamps_duplicados", 0) > 0:
            adicionar(
                "timestamps_duplicados",
                "warning",
                "Horários duplicados",
                "Há leituras com timestamps repetidos, o que pode distorcer duração e cadência.",
                f"{qualidade['timestamps_duplicados']} timestamp(s) duplicado(s)",
            )

        temperaturas_invalidas = (
            qualidade.get("leituras_temperatura_sem_valor", 0)
            + qualidade.get("temperaturas_fora_faixa_sensor", 0)
        )
        if temperaturas_invalidas > 0 or "temperatura" in qualidade.get("campos_essenciais_ausentes", []):
            adicionar(
                "qualidade_temperatura",
                "warning",
                "Problemas nos dados de temperatura",
                "Há valores ausentes, inválidos ou fora da faixa física plausível do sensor (-80 a 80 °C).",
                f"{temperaturas_invalidas} leitura(s) afetada(s)",
            )
        correntes_invalidas = (
            qualidade.get("leituras_corrente_sem_valor", 0)
            + qualidade.get("correntes_fora_faixa_sensor", 0)
        )
        if correntes_invalidas > 0 or "corrente" in qualidade.get("campos_essenciais_ausentes", []):
            adicionar(
                "qualidade_corrente",
                "warning",
                "Problemas nos dados de corrente",
                "Há valores ausentes, inválidos ou fora da faixa física plausível do sensor (0 a 100 A).",
                f"{correntes_invalidas} leitura(s) afetada(s)",
            )

    return avisos

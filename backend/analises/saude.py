def calcular_health_score(dados_termicos: dict, dados_eletricos: dict) -> dict:
    score = 100
    deducoes_motivo = []

    if not dados_termicos or not dados_eletricos:
        return {
            "health_score": None,
            "status_geral": "Indisponível",
            "fatores_de_risco": ["Dados insuficientes para análise térmica e elétrica."],
        }

    # --- Punições Térmicas ---
    if dados_termicos.get("falha_preditiva_detectada"):
        score -= 20
        deducoes_motivo.append("Aviso preditivo: Tendência de aquecimento detectada.")

    if (
        dados_termicos.get("alerta_temperatura_anomala_baixa")
        or dados_termicos.get("alerta_temperatura_anomala_alta")
    ):
        score -= 20
        deducoes_motivo.append("Desvio térmico persistente em relação ao padrão aprendido.")
    
    risco_termico = dados_termicos.get("percentual_tempo_em_risco", 0)
    if risco_termico > 2: # Acima de 2% do tempo em risco já perde ponto
        penalidade = min(int(risco_termico), 25) # Máximo de 25 pontos perdidos aqui
        score -= penalidade
        if risco_termico > 10:
            deducoes_motivo.append(f"Exposição: Passou {risco_termico}% do tempo em risco térmico.")

    # --- Punições Elétricas (Motor) ---
    if dados_eletricos.get("alerta_compressor_travando"):
        score -= 40
        deducoes_motivo.append("Alerta Crítico: Compressor com alta resistência/travando.")

    if dados_eletricos.get("alerta_corrente_alta_sustentada"):
        score -= 20
        deducoes_motivo.append("Corrente acima do padrão de operação por período prolongado.")

    if dados_eletricos.get("alerta_refrigeracao_ineficiente"):
        score -= 20
        deducoes_motivo.append("Temperatura sem resposta clara durante corrente elevada.")
        
    duty_cycle = dados_eletricos.get("duty_cycle_percentual", 0)
    if duty_cycle > 75:
        score -= 20
        deducoes_motivo.append(f"Sobrecarga térmica: Compressor operando {duty_cycle}% do tempo.")
    elif duty_cycle < 10:
        score -= 10
        deducoes_motivo.append("Subutilização extrema ou termostato defeituoso.")

    # Garante que a nota fica entre 0 e 100
    score = max(0, min(100, score))

    # Define o selo do dashboard
    if score >= 85:
        status = "Saudável"
    elif score >= 60:
        status = "Atenção"
    else:
        status = "Crítico"

    return {
        "health_score": score,
        "status_geral": status,
        "fatores_de_risco": deducoes_motivo
    }
import json
import random
from datetime import datetime, timedelta

def gerar_dados_simulados():
    registros = []
    # Começa a simulação a partir de 7 dias atrás
    tempo_atual = datetime.now() - timedelta(days=7)
    
    # Condições iniciais
    temperatura = 4.0
    compressor_ligado = False
    
    # Gera dados a cada 5 minutos durante 7 dias (aprox. 2000 registros)
    for _ in range(7 * 24 * 12):
        tempo_atual += timedelta(minutes=5)
        
        # Lógica do Termostato (liga em 6°C, desliga em 2°C)
        if temperatura >= 6.0 and not compressor_ligado:
            compressor_ligado = True
            corrente = round(random.uniform(15.0, 18.0), 2) # Pico de partida (Inrush)
        elif temperatura <= 2.0 and compressor_ligado:
            compressor_ligado = False
            corrente = 0.0
        
        # Comportamento enquanto ligado ou desligado
        if compressor_ligado:
            # Refrigera e mantém corrente nominal
            if temperatura >= 6.0: # Se acabou de ligar, mantém o pico neste minuto
                pass 
            else:
                corrente = round(random.uniform(5.0, 6.5), 2)
            
            temperatura -= random.uniform(0.2, 0.4)
            umidade = round(random.uniform(50.0, 55.0), 2)
        else:
            # Esquenta lentamente e corrente fica zerada
            corrente = 0.0
            temperatura += random.uniform(0.1, 0.3)
            umidade = round(random.uniform(60.0, 65.0), 2)
            
        registros.append({
            "timestamp": tempo_atual.isoformat(),
            "temperatura": round(temperatura, 2),
            "umidade": umidade,
            "corrente": corrente
        })

    # Cria uma anomalia proposital no último dia para testar o seu MVP preditivo
    # O compressor trava ligado e a corrente sobe muito
    for i in range(1, 20):
        registros[-i]["corrente"] = round(random.uniform(12.0, 14.0), 2)
        registros[-i]["temperatura"] = round(random.uniform(-1.0, 1.0), 2)

    # Salva tudo em um arquivo JSON
    with open("dados_simulados.json", "w", encoding="utf-8") as f:
        json.dump(registros, f, indent=4)
        
    print(f"Sucesso! Foram gerados {len(registros)} registros no arquivo 'dados_simulados.json'.")

if __name__ == "__main__":
    gerar_dados_simulados()
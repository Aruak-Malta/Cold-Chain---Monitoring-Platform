from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json

app = FastAPI()

# Isto permite que o seu Frontend (React) consiga comunicar com o Backend (Python) sem bloqueios de segurança
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # No MVP deixamos aberto, depois restringe-se ao localhost do React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analisar-equipamento")
async def analisar_dados_json(file: UploadFile = File(...)):
    """
    Esta função recebe o ficheiro JSON que você enviar pelo React.
    """
    # 1. Lemos o conteúdo do ficheiro carregado
    conteudo = await file.read()
    dados_json = json.loads(conteudo)
    
    # 2. Transformamos o JSON numa tabela (DataFrame) usando o Pandas
    # Assumimos que o JSON tem uma lista de leituras (ex: temperatura, corrente, timestamp)
    df = pd.DataFrame(dados_json)
    
    # 3. Fazemos algumas análises básicas do MVP
    # (Exemplo: Média da temperatura, pico de corrente elétrica, etc.)
    resumo = {
        "temperatura_media": df['temperatura'].mean() if 'temperatura' in df else 0,
        "corrente_maxima": df['corrente'].max() if 'corrente' in df else 0,
        "total_leituras": len(df)
    }
    
    # 4. Preparamos os dados para os gráficos do React
    # O React costuma precisar de listas (arrays) para desenhar gráficos
    dados_grafico = {
        "tempos": df['timestamp'].tolist() if 'timestamp' in df else [],
        "temperaturas": df['temperatura'].tolist() if 'temperatura' in df else [],
        "correntes": df['corrente'].tolist() if 'corrente' in df else []
    }
    
    # Devolvemos tudo mastigado para o React mostrar na tela!
    return {
        "mensagem": "Ficheiro processado com sucesso!",
        "resumo_analise": resumo,
        "dados_graficos": dados_grafico
    }
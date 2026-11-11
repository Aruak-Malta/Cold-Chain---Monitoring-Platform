# Cold Chain - Monitoring Platform

Aplicação MVP para monitoramento de equipamentos de cadeia fria. O repositório contém uma interface web em React/TypeScript, uma API em Python/FastAPI e um gerador opcional de dados simulados.

> **Estado do projeto:** os cadastros enviados pela interface são mantidos por sessão na memória do backend e no `sessionStorage` do navegador. Ainda não há banco de dados, autenticação ou persistência após reiniciar o backend. A visão geral e a tela de equipamentos convertem os cadastros para o mesmo modelo e componente de cartão usado pelos equipamentos demonstrativos; o painel lateral mantém o mesmo layout, apresenta os dados do JSON e os resultados da análise avançada. O gráfico de temperatura é suavizado para facilitar a leitura; as métricas numéricas são calculadas sobre as leituras originais. A tela de análises usa os laudos e séries da sessão, sem recorrer aos dados fixos da demonstração; métricas indisponíveis não são estimadas.

## Índice

- [Funcionalidades atuais](#funcionalidades-atuais)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar localmente](#como-executar-localmente)
- [Deploy na Azure App Service](#deploy-na-azure-app-service)
- [Gerar dados simulados](#gerar-dados-simulados)
- [Como testar o cadastro](#como-testar-o-cadastro)
- [API do backend](#api-do-backend)
- [Formato do JSON de telemetria](#formato-do-json-de-telemetria)
- [Armazenamento e sessões](#armazenamento-e-sessões)
- [Solução de problemas](#solução-de-problemas)
- [Segurança e limitações](#segurança-e-limitações)

## Funcionalidades atuais

- Interface web com páginas de visão geral, equipamentos, alertas, análises, relatórios e configurações.
- Formulário para cadastrar equipamento com nome e número de série.
- Upload opcional de JSON de telemetria durante o cadastro.
- Exibição dos equipamentos cadastrados nas telas de visão geral e equipamentos pelo mesmo modelo visual dos cartões existentes, com dados disponíveis do JSON e sem inventar métricas ausentes.
- A visão geral mostra os dados reais agregados pelo backend para a sessão atual e não apresenta alertas, consumo, custos ou atividade de demonstração como se fossem dados reais.
- API que calcula médias de temperatura/umidade, corrente máxima, total de leituras e séries para gráficos, incluindo uma curva de temperatura suavizada de forma robusta no backend.
- Tela de análises alimentada pelos dados cadastrados na sessão, com indicadores agregados calculados pelo backend, comparação horizontal de Health Score/duty cycle/risco térmico e investigação individual com laudos e séries reais.
- Página de avisos baseada em diagnósticos calculados pelo backend sobre a telemetria completa: desvios térmicos persistentes, corrente alta sustentada, refrigeração possivelmente ineficiente, duty cycle e qualidade/atualidade dos dados. Os reconhecimentos ficam no `sessionStorage` da aba e o contador de navegação acompanha avisos pendentes.
- Cadastro de vários equipamentos por sessão, com prevenção de números de série repetidos dentro da mesma sessão.
- Endpoint para consultar os equipamentos já enviados naquela sessão.
- Geração opcional de aproximadamente sete dias de leituras simuladas.

## Tecnologias

**Frontend**

- React 19
- TypeScript
- React Router
- Vite

**Backend**

- Python
- FastAPI e Uvicorn
- Pandas
- NumPy
- `python-multipart` para receber uploads de formulário

## Requisitos

- Python 3.10 ou superior.
- Node.js compatível com Vite 8 (Node.js 20.19+ ou 22.12+).
- npm, incluído na instalação do Node.js.
- Git, caso queira clonar o repositório.

## Estrutura do repositório

```text
.
├── backend/
│   ├── analises/
│   ├── dados_simulados.json
│   ├── gerar_dados.py
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   └── src/
└── README.md
```

## Como executar localmente

É necessário manter **dois terminais abertos**: um para o backend e outro para o frontend.

### 1. Preparar e iniciar o backend (Windows / PowerShell)

No primeiro terminal, entre na pasta do backend e crie um ambiente virtual:

```powershell
cd "C:\caminho\para\Cold Chain - Monitoring Platform\backend"
python -m venv .venv
```

O comando `python -m venv .venv` cria um ambiente Python isolado dentro de `backend/.venv`. Instale as dependências e inicie a API:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

O `pip install` baixa FastAPI, Uvicorn, Pandas, NumPy e `python-multipart` para esse ambiente. O Uvicorn inicia o servidor local e `--reload` reinicia a API quando o código Python muda. A API ficará em `http://localhost:8000`.

Para ativar o ambiente virtual em vez de chamar diretamente o Python dentro dele:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### 2. Preparar e iniciar o frontend

Abra um segundo terminal:

```powershell
cd "C:\caminho\para\Cold Chain - Monitoring Platform\frontend"
npm ci
npm run dev
```

`npm ci` instala as dependências registradas em `package-lock.json`. `npm run dev` inicia o servidor de desenvolvimento do Vite; abra o endereço que ele imprimir, normalmente `http://localhost:5173`.

Para encerrar qualquer um dos servidores, volte ao terminal correspondente e pressione `Ctrl+C`.

## Deploy na Azure App Service

O repositório contém workflows independentes em `.github/workflows/`: `main_backcoldchain.yml` publica somente `backend/` no App Service `BackColdChain`, e `main_frontcoldchain.yml` compila `frontend/` e publica os arquivos gerados no App Service `FrontColdChain`. Ambos acompanham a branch `main`, mas só são executados automaticamente quando há alterações na respectiva pasta ou no próprio workflow.

Configure os aplicativos como **Linux App Service**, com Python 3.11 para o backend e Node.js 22 para o frontend. O workflow do backend usa os secrets de autenticação Azure criados pelo Deployment Center. Para o frontend, baixe o perfil de publicação do App Service `FrontColdChain` no portal Azure e salve seu conteúdo como o secret `AZURE_FRONT_PUBLISH_PROFILE` em **GitHub → Settings → Secrets and variables → Actions → Secrets**; esse perfil deve pertencer ao frontend. Para o backend, configure `SCM_DO_BUILD_DURING_DEPLOYMENT=true` e o comando de inicialização `python -m uvicorn main:app --host 0.0.0.0 --port 8000`. Para o frontend, o pacote inclui um servidor Node.js e o script `npm start`.

No GitHub, em **Settings → Secrets and variables → Actions → Variables**, crie a variável `VITE_API_URL` com a URL pública do backend, por exemplo `https://<BackColdChain>.azurewebsites.net`. O workflow usa esse valor ao compilar o frontend. No App Service do backend, configure a variável de aplicação `FRONTEND_ORIGIN` com a URL pública do frontend, por exemplo `https://<FrontColdChain>.azurewebsites.net`; ela restringe o CORS à origem publicada. Depois, faça push na `main` para disparar cada deploy conforme os arquivos alterados.

## Relatórios

Os relatórios são consultados somente ao clicar em gerar/exportar. O período mensal padrão e as duas opções de mês acompanham o mês atual. Os indicadores de energia são estimativas integradas pelos timestamps e corrente enviados, assumindo 220 V e fator de potência 0,85; o custo aplica a tarifa salva em **Configurações → Energia e tarifas** (padrão de R$ 0,85/kWh). Leituras não são tratadas como medição de energia faturada, e períodos com timestamps ausentes não geram consumo estimado.

## Gerar dados simulados

O script opcional cria leituras aleatórias a cada cinco minutos para aproximadamente sete dias, incluindo uma anomalia no trecho final. Para gerar um novo arquivo, execute a partir da pasta `backend` com o ambiente virtual preparado:

```powershell
.\.venv\Scripts\python.exe gerar_dados.py
```

O arquivo será gravado como `dados_simulados.json` no diretório atual. **Executar o comando a partir de `backend` sobrescreve `backend/dados_simulados.json`**, que já contém dados simulados no repositório. Faça uma cópia antes se quiser preservar o arquivo atual.

Para gerar cinco cenários independentes de teste, cada um com um mês de telemetria a cada cinco minutos, execute:

```powershell
.\.venv\Scripts\python.exe gerar_bases_teste.py
```

O novo gerador salva os arquivos em `backend/bases_teste/` e não altera `dados_simulados.json`. Os cenários cobrem temperatura persistentemente alta ou baixa, corrente alta sustentada com refrigeração possivelmente ineficiente, duty cycle elevado e problemas de qualidade da telemetria. Executar novamente substitui somente os cinco arquivos com esses mesmos nomes dentro de `bases_teste`.

### macOS / Linux

No terminal do backend:

```bash
cd "/caminho/para/Cold Chain - Monitoring Platform/backend"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Em outro terminal, inicie o frontend:

```bash
cd "/caminho/para/Cold Chain - Monitoring Platform/frontend"
npm ci
npm run dev
```

## Como testar o cadastro

Com os dois servidores em execução:

1. Abra o endereço do Vite no navegador.
2. Vá para **Equipamentos** e clique em **Novo equipamento**.
3. Informe um nome e um número de série. Por exemplo, `Freezer de teste` e `TESTE-001`.
4. Para incluir telemetria, selecione `backend/dados_simulados.json` ou um JSON que siga o [formato documentado abaixo](#formato-do-json-de-telemetria).
5. Envie o cadastro. Cadastre outro dispositivo com outro número de série; os dois devem ser aceitos.
6. Tente enviar novamente o mesmo número de série na mesma aba. A API deve responder com conflito e o frontend deve avisar que o número já existe na sessão.

### Testes automatizados do backend

Com as dependências instaladas no ambiente virtual, execute a partir da pasta `backend`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

Os testes cobrem o contrato de JSON vazio, downsampling, médias com valor zero, análise avançada associada à sessão, contagem de partidas, detecção dos problemas injetados na base simulada, descarte de picos elétricos isolados e qualidade dos timestamps/leituras.

### Testar diretamente a API no Windows

Os exemplos a seguir usam `curl.exe` no PowerShell e devem ser executados a partir da pasta raiz do repositório.

Cadastrar um equipamento com telemetria:

```powershell
curl.exe -X POST `
  -H "X-Session-ID: sessao-de-teste" `
  -F "nome=Freezer de teste" `
  -F "serial=TESTE-001" `
  -F "file=@backend/dados_simulados.json" `
  http://localhost:8000/equipamentos
```

Cadastrar outro equipamento na mesma sessão: altere o valor de `serial` para `TESTE-002` e, se desejar, altere o nome.

Listar equipamentos da sessão:

```powershell
curl.exe -H "X-Session-ID: sessao-de-teste" http://localhost:8000/equipamentos
```

Para testar o isolamento, consulte com outro identificador:

```powershell
curl.exe -H "X-Session-ID: outra-sessao" http://localhost:8000/equipamentos
```

Essa sessão deve retornar uma lista vazia. Repetir o cadastro de `TESTE-001` com `sessao-de-teste` deve retornar HTTP `409`.

### Conferir o armazenamento da aba

No navegador, abra as ferramentas de desenvolvedor (F12), selecione **Console** e execute:

```js
JSON.parse(sessionStorage.getItem("equipamentos") || "[]")
```

O ID utilizado para identificar a sessão da aba fica em:

```js
sessionStorage.getItem("cold-chain-session-id")
```

É possível consultar no backend a lista associada àquela aba:

```js
const sessionId = sessionStorage.getItem("cold-chain-session-id");
await fetch("http://localhost:8000/equipamentos", {
  headers: { "X-Session-ID": sessionId }
}).then((response) => response.json());
```

## API do backend

A documentação interativa gerada pelo FastAPI fica em `http://localhost:8000/docs`. O schema OpenAPI fica em `http://localhost:8000/openapi.json`.

### `POST /equipamentos`

Cadastra um equipamento e, se houver upload, processa a telemetria antes de armazená-lo na sessão.

- **Cabeçalho obrigatório:** `X-Session-ID` (1 a 128 caracteres).
- **Corpo:** `multipart/form-data`.
- **Campos obrigatórios:** `nome` e `serial`.
- **Campos opcionais:** `setor` (padrão `Sem setor`) e `file` (arquivo JSON de telemetria).
- **Resposta de sucesso:** objeto com a lista `equipamentos` da sessão atualizada.
- **Erros esperados:** `400` para JSON inválido, `409` para número de série duplicado na sessão e `422` para dados/campos inválidos.

Exemplo de resposta:

```json
{
  "equipamentos": [
    {
      "nome": "Freezer de teste",
      "serial": "TESTE-001",
      "setor": "Congelados",
      "telemetria": {
        "resumo_analise": {
          "temperatura_media": 4.2,
          "umidade_media": 53.5,
          "corrente_maxima": 6.1,
          "total_leituras": 2
        },
        "dados_graficos": {
          "tempos": ["2026-10-18T10:00:00", "2026-10-18T10:05:00"],
          "temperaturas": [4.1, 4.3],
          "temperaturas_suavizadas": [4.1, 4.2],
          "umidades": [53.0, 54.0],
          "umidades_suavizadas": [53.0, 53.5],
          "correntes": [5.8, 6.1],
          "correntes_suavizadas": [5.8, 6.0]
        }
      },
      "analise_avancada": null
    }
  ]
}
```

Sem arquivo, `telemetria` será `null`.

Depois do upload, a interface chama `POST /analise-avancada` com o número de série e recebe a lista atualizada com os laudos correspondentes.

### `GET /equipamentos`

Retorna os equipamentos cadastrados para a sessão informada.

- **Cabeçalho obrigatório:** o mesmo `X-Session-ID` usado no cadastro.
- **Resposta de sucesso:** `{ "equipamentos": [...] }`. Uma sessão ainda sem cadastros retorna uma lista vazia.

### `GET /relatorios/dados`

Retorna, apenas para a sessão informada, os equipamentos, análises disponíveis e todas as leituras brutas carregadas por JSON. A interface consulta essa rota somente quando o usuário clica para gerar/exportar um relatório. O modelo de telemetria bruta é exportado em CSV; os relatórios consolidados, de gestão, alertas e eficiência são PDFs.

- **Cabeçalho obrigatório:** `X-Session-ID`.
- **Resposta de sucesso:** `{ "equipamentos": [{ ..., "leituras": [...] }] }`.
- Dados de consumo em kWh, custos e identidade de usuários não são inventados: o modelo atual não coleta essas informações.

### `GET /resumo`

Retorna métricas calculadas pelo backend a partir dos dados brutos e das análises armazenadas na sessão.

- **Cabeçalho obrigatório:** `X-Session-ID`.
- **Campos:** `total_equipamentos`, `total_leituras`, `analises_concluidas`, `alertas`, `health_score_medio`, `riscos_criticos`, `duty_cycle_medio` e `temperatura_media`.
- `health_score_medio` e `duty_cycle_medio` são médias apenas dos laudos que possuem esses valores; quando não há valores disponíveis, retornam `null`. `riscos_criticos` conta os equipamentos classificados como Crítico pelo laudo de saúde.
- Sem dados de temperatura, `temperatura_media` é `null`; as outras contagens permanecem zero.

### `POST /analise-avancada`

Executa as análises térmica, elétrica e de saúde sobre a telemetria bruta armazenada para um equipamento da sessão. O frontend chama essa rota automaticamente após o cadastro de um JSON.

- **Cabeçalho obrigatório:** `X-Session-ID`.
- **Corpo JSON:** `{ "serial": "TESTE-001" }`.
- **Resposta:** lista atualizada em `equipamentos`, incluindo `analise_avancada` no equipamento analisado.
- **Erros esperados:** `404` se o equipamento não existir nessa sessão; `422` se não houver arquivo de telemetria.
- As análises térmica e elétrica exigem pelo menos 30 valores numéricos válidos de suas respectivas colunas. Quando faltam dados, os laudos ficam `null` e o `health_score` também é `null` (indisponível), não zero.

## Formato do JSON de telemetria

O arquivo deve conter um objeto JSON ou, normalmente, uma lista de registros. Cada registro pode incluir `timestamp`, `temperatura` e `corrente`; o cálculo ignora colunas ausentes.

```json
[
  {
    "timestamp": "2026-10-18T10:00:00",
    "temperatura": -18.2,
    "umidade": 62,
    "corrente": 4.1
  },
  {
    "timestamp": "2026-10-18T10:05:00",
    "temperatura": -18.5,
    "umidade": 63,
    "corrente": 4.4
  }
]
```

A resposta básica contém:

- `resumo_analise.temperatura_media`, `umidade_media` e `corrente_maxima`: métricas calculadas com os valores numéricos válidos, ou `null` se a coluna não tiver valores válidos. Uma média real igual a zero continua sendo `0`.
- `resumo_analise.total_leituras`: quantidade de registros.
- `dados_graficos.tempos`, as séries originais e `temperaturas_suavizadas`, `umidades_suavizadas` e `correntes_suavizadas`: pontos amostrados e alinhados para os gráficos. Os dados ausentes/inválidos são `null`, e o downsampling mantém no máximo 100 pontos. JSON vazio também retorna esse formato, com zero leituras e listas vazias.
- As três séries suavizadas são calculadas no backend com filtro de mediana móvel adaptativo seguido de média móvel centrada: isso reduz picos breves, como abertura momentânea da porta, sem apagar variações sustentadas. A janela cresce com o tamanho da base até um limite, e as médias da telemetria continuam calculadas sobre os valores originais.
- No painel lateral, a legenda permite destacar temperatura (verde original), umidade (azul claro) ou corrente (amarelo). As séries não selecionadas ficam esmaecidas; cada grandeza usa escala vertical independente, indicada no gráfico.

O resultado `analise_avancada` contém `termica`, `eletrica`, `qualidade`, `avisos` e `saude`. O risco térmico e a tendência usam os timestamps em ordem cronológica quando todos são válidos e distintos; caso contrário, são calculados pela sequência das leituras. `base_temporal` informa qual base foi usada. A análise elétrica informa partidas observadas como transições de desligado para ligado.

### Avisos calculados

- A página **Avisos** não usa eventos fixos de demonstração. O backend analisa as leituras completas e entrega diagnósticos identificados; a interface não tenta deduzir falhas a partir das séries reduzidas do gráfico.
- Desvios térmicos altos ou baixos são relativos à distribuição aprendida para cada equipamento (limite superior de 1,5 IQR e limite inferior equivalente), sem impor uma faixa de produto universal. O desvio precisa aparecer em pelo menos três leituras consecutivas e, quando há timestamps confiáveis, durar ao menos 10 minutos.
- Corrente alta sustentada é calculada com mediana e desvio absoluto mediano da corrente em operação; picos isolados de partida não bastam. O aviso de refrigeração possivelmente ineficiente combina corrente alta sustentada com queda térmica menor que 0,5 °C durante o trecho.
- Também são identificados tendência de aquecimento, exposição acima do limite térmico relativo, duty cycle acima de 75% ou abaixo de 10%, telemetria antiga, lacunas de amostragem, timestamps ausentes/inválidos/duplicados e valores de temperatura/corrente ausentes ou fora de uma faixa física ampla do sensor.
- Uma telemetria é considerada antiga quando o tempo desde a última leitura excede três cadências medianas, com mínimo de 15 minutos. Uma lacuna temporal segue o mesmo critério. Prioridade crítica em corrente sustentada é aplicada a eventos com ao menos 60 minutos; os demais desvios relativos permanecem como atenção, pois não há limites absolutos de conservação configurados.
- Os limites físicos de qualidade são apenas verificações genéricas de sensor (-80 a 80 °C e 0 a 100 A), não limites de segurança do produto. Umidade ainda não gera avisos, conforme decisão do MVP. Os laudos térmico e elétrico continuam exigindo ao menos 30 valores numéricos válidos; os avisos de qualidade podem existir mesmo quando uma série não alcança esse mínimo.
- O horário exibido é a leitura mais recente com timestamp válido no JSON; se o arquivo não tiver timestamps válidos, a interface informa que o horário não foi fornecido.
- Reconhecer um aviso altera seu estado apenas nesta aba/sessão do navegador; o sistema ainda não grava histórico de auditoria em banco de dados.
- Ao enviar um JSON pela interface, o cadastro e a telemetria aparecem primeiro; a análise avançada é iniciada em segundo plano e o modal fecha sem esperar o laudo. A interface atualiza os cartões e avisos quando o backend concluir.
- A suavização de gráficos usa uma janela curta para reduzir ruído sem achatar padrões longos. Desvios abruptos maiores que o ruído estimado (com piso de 0,5 unidade) preservam a leitura original para não apagar possíveis anomalias.

## Armazenamento e sessões

- O frontend gera um identificador com `crypto.randomUUID()` e guarda-o em `sessionStorage["cold-chain-session-id"]`.
- Cada requisição de cadastro/listagem envia esse identificador no cabeçalho HTTP `X-Session-ID`.
- O backend guarda registros em memória, separados por identificador de sessão. Não grava esses dados em arquivo ou banco.
- A telemetria bruta fica somente na memória do backend para permitir a análise avançada; reiniciar o backend apaga também esses dados e os resultados.
- O frontend guarda a última lista devolvida pelo backend em `sessionStorage["equipamentos"]`.
- A interface carrega a lista da sessão pela API e converte cada cadastro para o modelo `Equipment` já usado pelos cartões existentes. Assim, dados de demonstração e cadastrados passam pelo mesmo componente visual; valores que não existem no JSON aparecem como `—`, sem estimativas inventadas.
- O cartão utiliza o setor e o número de série na localização, temperatura/umidade médias, corrente máxima e a quantidade de leituras. O painel lateral reutiliza a estrutura dos detalhes existentes, substituindo os valores demonstrativos pelos dados do JSON e exibindo os resultados da análise avançada. O gráfico suaviza visualmente as leituras agrupadas sem alterar os cálculos das métricas.
- `sessionStorage` pertence à aba do navegador e sobrevive a recarregamentos da página, mas pode ser limpo ao encerrar a sessão da aba.
- Reiniciar o backend apaga os cadastros mantidos em memória. Depois de reiniciado, o `sessionStorage` do navegador pode ainda mostrar a lista antiga, mas a API estará vazia.
- Os registros ficam isolados por sessão, e o mesmo número de série pode ser cadastrado em sessões diferentes.

## Solução de problemas

### `python` não foi encontrado

Confirme que Python 3.10 ou superior está instalado e disponível no terminal. No Windows, tente `py --version`; se usar o lançador `py`, substitua `python` por `py` ao criar o ambiente virtual.

### Erro de módulo Python ausente

Confirme que o ambiente virtual está ativo ou use o executável em `backend/.venv/Scripts/python.exe`, e instale as dependências com:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### `npm` não foi encontrado

Instale Node.js compatível com Vite 8, feche e abra novamente o terminal e confirme `node --version` e `npm --version`.

### O frontend não consegue contactar a API

- Confirme que o terminal do backend continua aberto e que Uvicorn está ouvindo em `http://localhost:8000`.
- Abra `http://localhost:8000/docs` para conferir se a API responde.
- Confira o Console e a aba Network das ferramentas de desenvolvedor do navegador.
- Não use uma página HTTPS para chamar esta API HTTP sem ajustar a configuração de implantação; navegadores podem bloquear conteúdo misto.

### O cadastro retorna HTTP `409`

O número de série já foi cadastrado na mesma sessão. Use outro número ou abra uma nova sessão/aba para testar o isolamento.

### O cadastro retorna HTTP `400`

O arquivo não é JSON válido ou não tem o formato de objeto/lista esperado. Confira vírgulas, aspas e colchetes do arquivo.

## Segurança e limitações

- O CORS do backend permite `http://localhost:5173` por padrão; em produção, defina `FRONTEND_ORIGIN` com a origem pública do frontend.
- `X-Session-ID` separa dados de sessão, mas não autentica usuários nem protege dados contra alguém que conheça o identificador.
- Os dados em memória são voláteis e não são compartilhados entre múltiplos processos/instâncias do servidor.
- Não envie dados pessoais, segredos ou telemetria confidencial para esta versão sem implementar autenticação, controles de acesso, validação/limites de upload e armazenamento apropriado.
- O formulário atualmente envia nome, número de série e arquivo JSON; outros campos visuais do modal, como setor e tensão, ainda não fazem parte do cadastro da API.
- Os cartões demonstrativos continuam visíveis junto dos equipamentos cadastrados. A tela de análises ainda não consolida os dados dos JSONs; seus gráficos são demonstrativos.

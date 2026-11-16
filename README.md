# Cold Chain - Monitoring Platform

Aplicação MVP para monitoramento de equipamentos de cadeia fria. O repositório contém uma interface web em React/TypeScript, uma API em Python/FastAPI e um gerador opcional de dados simulados.

> **Estado do projeto:** autenticação, perfil, empresas e cadastros de equipamentos da conta são gerenciados pelo Supabase. Equipamentos ficam vinculados à empresa selecionada, incluindo nome, número de série, setor e tensão; JSONs de telemetria e análises permanecem temporários na sessão. A demonstração continua usando cadastros por sessão. A visão geral e a tela de equipamentos convertem os cadastros para o mesmo modelo e componente de cartão; o painel lateral apresenta os dados disponíveis e os resultados da análise avançada. O gráfico de temperatura é suavizado para facilitar a leitura; as métricas numéricas são calculadas sobre as leituras originais.

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
- Formulário para cadastrar equipamento por empresa com nome, número de série, setor e tensão de operação.
- Upload opcional de JSON de telemetria durante o cadastro.
- Persistência dos dados cadastrais do equipamento no Supabase, vinculados à empresa selecionada. O JSON e os resultados das análises continuam temporários na sessão.
- Exibição dos equipamentos cadastrados nas telas de visão geral e equipamentos pelo mesmo modelo visual dos cartões existentes, com dados disponíveis do JSON e sem inventar métricas ausentes.
- A visão geral mostra os dados reais agregados pelo backend para a sessão atual e não apresenta alertas, consumo, custos ou atividade de demonstração como se fossem dados reais.
- API que calcula médias de temperatura/umidade, corrente máxima, total de leituras e séries para gráficos, incluindo uma curva de temperatura suavizada de forma robusta no backend.
- Tela de análises alimentada pelos dados cadastrados na sessão, com indicadores agregados calculados pelo backend, comparação horizontal de Health Score/duty cycle/risco térmico e investigação individual com laudos e séries reais.
- Página de avisos baseada em diagnósticos calculados pelo backend sobre a telemetria completa: desvios térmicos persistentes, corrente alta sustentada, refrigeração possivelmente ineficiente, duty cycle e qualidade/atualidade dos dados. Os reconhecimentos ficam no `sessionStorage` da aba e o contador de navegação acompanha avisos pendentes.
- Cadastro de vários equipamentos na empresa selecionada; não há verificação de duplicidade do número de série no Supabase.
- Endpoint para consultar os equipamentos já enviados naquela sessão.
- Geração opcional de aproximadamente sete dias de leituras simuladas.

## Tecnologias

**Frontend**

- React 19
- TypeScript
- React Router
- Vite
- Supabase Auth e Postgres

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

### Configurar autenticação e empresas no Supabase

1. No projeto Supabase, execute [`supabase/auth-setup.sql`](./supabase/auth-setup.sql) no SQL Editor. O script mantém o Supabase Auth como fonte das credenciais, torna `Login.senha` opcional (a aplicação nunca grava senhas nessa tabela), habilita RLS e restringe os registros de `Login` e `Company` ao usuário autenticado. As tabelas devem ter os campos `Login(id_login, email, nome)` e `Company(id_company, id_login, nome, cnpj)`, com `Company.id_login` relacionado a `Login.id_login`.
2. Para exibir os dados das empresas no painel autenticado, execute [`supabase/dashboard-company-access.sql`](./supabase/dashboard-company-access.sql). Ele libera a leitura das colunas necessárias para usuários autenticados; a política RLS existente continua limitando quais empresas cada conta pode ler.
3. Para atualizar instalações que já executaram o `auth-setup.sql`, execute [`supabase/login-name-update.sql`](./supabase/login-name-update.sql). Ele permite atualizar apenas `Login.nome` do usuário autenticado e mantém a política RLS limitada ao e-mail da sessão. O fluxo Google usa o nome completo do perfil do provedor, incluindo sobrenome quando disponível.
4. Execute [`supabase/equipment-persistence.sql`](./supabase/equipment-persistence.sql) para preparar `Equipamento` para os campos do formulário, habilitar RLS e permitir que usuários autenticados leiam e cadastrem equipamentos somente nas próprias empresas. O nome é gravado na coluna existente `nome_equipamento`; a migração adiciona setor, número de série e tensão quando necessário. O acesso de tabela é limitado por políticas RLS à empresa do usuário autenticado. Equipamentos antigos sem tensão permanecem com `NULL`; as tensões aceitas são 127 V e 220 V. Não é criada uma regra de unicidade para o número de série.
5. Para conferir e completar os relacionamentos do diagrama sem alterar ou apagar dados, execute [`supabase/schema-integrity.sql`](./supabase/schema-integrity.sql) no SQL Editor. O script é idempotente: mantém FKs existentes, valida FKs existentes que ainda não foram validadas e cria somente as que estiverem faltando entre `Login`, `Company`, `Equipamento`, `Data`, `Limites` e `Avisos`. Se encontrar tabelas/colunas ausentes ou dados que violem um relacionamento, ele falha sem remover registros; nesse caso, revise a mensagem antes de corrigir os dados.
6. No Supabase, habilite Google em **Authentication → Providers → Google** e configure as URLs de redirecionamento de cadastro/login para `http://localhost:5173/empresas` e para `https://<seu-dominio>/empresas`.
7. Crie `frontend/.env.local` com a URL do projeto e a chave pública (anon/publishable). Nunca use a chave `service_role` no frontend:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public-anon-key>
   ```

8. No GitHub, em **Settings → Secrets and variables → Actions → Variables**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O workflow do container passa essas variáveis ao build do frontend. Elas são públicas no bundle; não use `service_role`.

O botão **Ver demonstração** continua acessível sem conta em `/demo`. **Acessar Painel** abre o login; após autenticar, uma conta sem empresas é encaminhada ao cadastro obrigatório e uma conta com empresas vai para `/app`. A rota `/app` valida a sessão e mostra somente os dados da conta; a demonstração continua isolada em `/demo`. No painel, use o seletor da barra lateral para alternar entre empresas; a opção **Adicionar empresa** abre o cadastro de outra empresa. O login Google cria/valida a sessão pelo Supabase Auth e também segue para o cadastro de empresas quando necessário.

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

O workflow disponível em `.github/workflows/main_backcoldchain.yml` constrói uma única imagem Docker com o frontend React e a API FastAPI e publica essa imagem no App Service `BackColdChain`. Ele acompanha a branch `main` e é disparado por alterações em `backend/`, `frontend/`, `Dockerfile`, `.dockerignore` ou no próprio workflow.

Antes do deploy, configure em **GitHub → Settings → Secrets and variables → Actions**:

- Em **Variables**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores públicos do projeto Supabase. O workflow falha antes de construir a imagem se algum estiver ausente. Esses valores são incorporados ao JavaScript do navegador; não use a chave `service_role`.
- Em **Secrets**, confirme `GHCR_USER` e `GHCR_PULL_TOKEN` (com acesso `read:packages`) e os três secrets `AZUREAPPSERVICE_CLIENTID_99BFA4E5B2864C3988B55D22BF61566D`, `AZUREAPPSERVICE_TENANTID_00D046EC612A4387A08854C147571E7D` e `AZUREAPPSERVICE_SUBSCRIPTIONID_9782ECF29CF14329BB2F341CA199B95A`, usados pelo workflow para autenticar no Azure.

O Dockerfile recebe as duas variáveis Supabase durante `npm run build`; configurá-las somente como variáveis de execução do App Service não altera o bundle já compilado. O frontend e a API são servidos pela mesma origem, portanto `VITE_API_URL` e `FRONTEND_ORIGIN` não são necessários nesse deploy integrado. Depois de confirmar que o SQL do Supabase foi executado e o provedor Google está configurado com as URLs de redirecionamento de produção, faça push na `main` para construir e publicar a nova imagem.

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
2. Entre em `/demo`, vá para **Equipamentos** e clique em **Novo equipamento** para testar o cadastro por sessão. No painel autenticado, o cadastro fica salvo na empresa selecionada.
3. Informe um nome e um número de série. Por exemplo, `Freezer de teste` e `TESTE-001`.
4. Para incluir telemetria, selecione `backend/dados_simulados.json` ou um JSON que siga o [formato documentado abaixo](#formato-do-json-de-telemetria).
5. Envie o cadastro. Cadastre outro dispositivo com outro número de série; os dois devem ser aceitos.
6. Na demonstração, tente enviar novamente o mesmo número de série na mesma aba. A API deve responder com conflito. No painel de conta, não há verificação de duplicidade do número de série.

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
- Cada requisição de telemetria envia esse identificador no cabeçalho HTTP `X-Session-ID`; no painel de conta, a sessão também é isolada por empresa.
- Os dados cadastrais de equipamentos da conta ficam na tabela `Equipamento` do Supabase, vinculados a `id_company`. A demonstração continua usando somente a sessão.
- O backend guarda JSONs e análises em memória, separados por identificador de sessão; não grava a telemetria em arquivo ou banco.
- O frontend guarda a última lista devolvida pelo backend em `sessionStorage["equipamentos"]`.
- O Supabase Auth autentica contas; os perfis e empresas ficam nas tabelas públicas `Login` e `Company`, protegidas por RLS. Isso não torna os endpoints de telemetria do backend autenticados.
- No painel de conta, a interface carrega equipamentos do Supabase e combina seus metadados com a telemetria correspondente da sessão. A demonstração carrega os equipamentos diretamente da sessão.
- Valores que não existem no JSON aparecem como `—`, sem estimativas inventadas.
- O cartão utiliza o setor e o número de série na localização, temperatura/umidade médias, corrente máxima e a quantidade de leituras. O painel lateral reutiliza a estrutura dos detalhes existentes, substituindo os valores demonstrativos pelos dados do JSON e exibindo os resultados da análise avançada. O gráfico suaviza visualmente as leituras agrupadas sem alterar os cálculos das métricas.
- `sessionStorage` pertence à aba do navegador e sobrevive a recarregamentos da página, mas pode ser limpo ao encerrar a sessão da aba.
- Reiniciar o backend apaga JSONs e análises mantidos em memória. Os equipamentos da conta continuam salvos no Supabase; após reiniciar, a telemetria precisa ser enviada novamente.
- O mesmo número de série pode ser cadastrado mais de uma vez; não há verificação de MAC/serial no Supabase.

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

- No deploy integrado do Docker, frontend e API compartilham a mesma origem e não precisam de CORS entre si. Se o frontend for hospedado separadamente, defina `FRONTEND_ORIGIN` com a origem pública exata do frontend.
- O Supabase Auth protege os perfis e empresas, mas os endpoints de telemetria ainda usam apenas `X-Session-ID`, que não autentica usuários nem protege dados contra alguém que conheça o identificador.
- Os dados em memória são voláteis e não são compartilhados entre múltiplos processos/instâncias do servidor.
- Não envie telemetria confidencial para esta versão sem validar a autenticação e autorização do usuário também nos endpoints do backend, além de implementar limites de upload e armazenamento apropriado.
- No painel de conta, a tensão é persistida no Supabase junto aos demais dados cadastrais do equipamento; a demonstração não oferece esse campo.
- Os cartões demonstrativos continuam visíveis junto dos equipamentos cadastrados. A tela de análises ainda não consolida os dados dos JSONs; seus gráficos são demonstrativos.

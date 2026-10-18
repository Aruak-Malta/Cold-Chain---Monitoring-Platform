# Cold Chain - Monitoring Platform

Aplicação MVP para monitoramento de equipamentos de cadeia fria. O repositório contém uma interface web em React/TypeScript, uma API em Python/FastAPI e um gerador opcional de dados simulados.

> **Estado do projeto:** os cadastros enviados pela interface são mantidos por sessão na memória do backend e no `sessionStorage` do navegador. Ainda não há banco de dados, autenticação ou persistência após reiniciar o backend. As telas de equipamentos e análises também contêm dados de demonstração; os novos cadastros ainda não substituem os cartões demonstrativos da tela.

## Índice

- [Funcionalidades atuais](#funcionalidades-atuais)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como executar localmente](#como-executar-localmente)
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
- API que calcula média de temperatura, corrente máxima, total de leituras e séries para gráficos.
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
│   ├── dados_simulados.json
│   ├── gerar_dados.py
│   ├── main.py
│   └── requirements.txt
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

O `pip install` baixa FastAPI, Uvicorn, Pandas e `python-multipart` para esse ambiente. O Uvicorn inicia o servidor local e `--reload` reinicia a API quando o código Python muda. A API ficará em `http://localhost:8000`.

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

## Gerar dados simulados

O script opcional cria leituras aleatórias a cada cinco minutos para aproximadamente sete dias, incluindo uma anomalia no trecho final. Para gerar um novo arquivo, execute a partir da pasta `backend` com o ambiente virtual preparado:

```powershell
.\.venv\Scripts\python.exe gerar_dados.py
```

O arquivo será gravado como `dados_simulados.json` no diretório atual. **Executar o comando a partir de `backend` sobrescreve `backend/dados_simulados.json`**, que já contém dados simulados no repositório. Faça uma cópia antes se quiser preservar o arquivo atual.

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
- **Campo opcional:** `file`, arquivo JSON de telemetria.
- **Resposta de sucesso:** objeto com a lista `equipamentos` da sessão atualizada.
- **Erros esperados:** `400` para JSON inválido, `409` para número de série duplicado na sessão e `422` para dados/campos inválidos.

Exemplo de resposta:

```json
{
  "equipamentos": [
    {
      "nome": "Freezer de teste",
      "serial": "TESTE-001",
      "telemetria": {
        "mensagem": "Ficheiro processado com sucesso!",
        "resumo_analise": {
          "temperatura_media": 4.2,
          "corrente_maxima": 6.1,
          "total_leituras": 2
        },
        "dados_graficos": {
          "tempos": ["2026-10-18T10:00:00", "2026-10-18T10:05:00"],
          "temperaturas": [4.1, 4.3],
          "correntes": [5.8, 6.1]
        }
      }
    }
  ]
}
```

Sem arquivo, `telemetria` será `null`.

### `GET /equipamentos`

Retorna os equipamentos cadastrados para a sessão informada.

- **Cabeçalho obrigatório:** o mesmo `X-Session-ID` usado no cadastro.
- **Resposta de sucesso:** `{ "equipamentos": [...] }`. Uma sessão ainda sem cadastros retorna uma lista vazia.

### `POST /analisar-equipamento`

Processa um arquivo JSON enviado no campo `file`, mas **não** cadastra nem associa o resultado a uma sessão. Para cadastrar e analisar em uma única operação, use `POST /equipamentos`.

## Formato do JSON de telemetria

O arquivo deve conter um objeto JSON ou, normalmente, uma lista de registros. Cada registro pode incluir `timestamp`, `temperatura` e `corrente`; o cálculo ignora colunas ausentes.

```json
[
  {
    "timestamp": "2026-10-18T10:00:00",
    "temperatura": -18.2,
    "corrente": 4.1
  },
  {
    "timestamp": "2026-10-18T10:05:00",
    "temperatura": -18.5,
    "corrente": 4.4
  }
]
```

A resposta da análise contém:

- `resumo_analise.temperatura_media`: média da coluna `temperatura`, ou `0` se ela não existir.
- `resumo_analise.corrente_maxima`: maior valor da coluna `corrente`, ou `0` se ela não existir.
- `resumo_analise.total_leituras`: quantidade de registros.
- `dados_graficos.tempos`, `temperaturas` e `correntes`: valores das colunas correspondentes ou listas vazias se as colunas não existirem.

## Armazenamento e sessões

- O frontend gera um identificador com `crypto.randomUUID()` e guarda-o em `sessionStorage["cold-chain-session-id"]`.
- Cada requisição de cadastro/listagem envia esse identificador no cabeçalho HTTP `X-Session-ID`.
- O backend guarda registros em memória, separados por identificador de sessão. Não grava esses dados em arquivo ou banco.
- O frontend guarda a última lista devolvida pelo backend em `sessionStorage["equipamentos"]`.
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

- A configuração atual de CORS aceita qualquer origem e está indicada apenas para desenvolvimento do MVP. Antes de publicar, restrinja-a ao domínio real do frontend.
- `X-Session-ID` separa dados de sessão, mas não autentica usuários nem protege dados contra alguém que conheça o identificador.
- Os dados em memória são voláteis e não são compartilhados entre múltiplos processos/instâncias do servidor.
- Não envie dados pessoais, segredos ou telemetria confidencial para esta versão sem implementar autenticação, controles de acesso, validação/limites de upload e armazenamento apropriado.
- O formulário atualmente envia nome, número de série e arquivo JSON; outros campos visuais do modal, como setor e tensão, ainda não fazem parte do cadastro da API.
- A tela Equipamentos e as análises continuam usando dados de demonstração. A API e o `sessionStorage` aceitam múltiplos registros, mas ainda falta integrar a listagem visual da página à API.

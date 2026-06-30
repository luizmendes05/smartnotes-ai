# 🧠 SmartNotes AI — Bloco de Notas Inteligente Offline

O **SmartNotes AI** é um editor de notas inteligente, minimalista e de alta performance que funciona **100% de forma local, offline e privada**. 

Desenvolvido para apresentações profissionais, acompanhamento de produtividade e ambientes corporativos que prezam pela segurança de dados, o SmartNotes AI integra-se diretamente ao **Foundry Local AI** (ou qualquer outro runner local de LLM) para oferecer recursos avançados de processamento de texto, assistente de chat contextualizado, apresentações de slides, atas de reunião, calculadora de impacto/ROI, raspagem web e recursos de áudio.

---

## 🌐 Suporte a Multilíngue (i18n)
A aplicação conta com **Português (Brasil) como idioma padrão** para conforto regional e possui um alternador de idioma dinâmico (`🇺🇸` / `🇧🇷`) no cabeçalho para **Inglês**. A mudança de idioma atualiza instantaneamente todos os elementos da interface visual, placeholders, diálogos de confirmação, e adapta as instruções do sistema da IA local (prompts) para responder de forma nativa na língua selecionada.

*Note: To read the documentation in English, access [README.md](README.md).*

---

## ⚡ Principais Funcionalidades

### 1. Editor Rich Text Premium ✍️🎨
* **Controles de Formatação**: Formatação em tempo real com **Negrito**, **Itálico**, **Sublinhado** e **Tachado**.
* **Tipografia Moderna**: Seleção de fontes corporativas (*Plus Jakarta Sans, Inter, Poppins, Montserrat, Playfair Display, Lora, Fira Code, Georgia, Courier*) e tamanhos.
* **Layout**: Alinhamentos (Esquerda, Centralizado, Direita) e listas (**Listas com Marcadores** e **Listas Numeradas**).
* **Cores**: Ajustes de **Cor do Texto**, **Cor de Destaque (Fundo)** e botão de **Limpar Destaque**.
* **🔗 Conexões Rápidas por WikiLinks (`[[`)**: Digite `[[` no editor para abrir o popover de sugestão inteligente de notas. Selecionar uma nota insere a referência `[[Título da Nota]]`, criando uma conexão visual e semântica imediata no Grafo de Conhecimento.
* **⌨️ Comandos Slash (`/`)**: Digite `/` no início de uma linha vazia para abrir um menu de injeção rápida de modelos estruturados (Auditorias de Vulnerabilidade, Atas, Tabelas, Código, e atalhos de IA local).
* **💡 Placeholders Dinâmicos e Central de Dicas (💡)**: Exibe dicas de inicialização dentro de notas em branco. Uma gaveta retrátil de Guia Rápido (`?` no rodapé da barra lateral) detalha todos os atalhos ocultos, comandos de teclado e comportamentos interativos do grafo.
* **Persistência e Histórico**: Preserva a seleção de texto e posição do cursor ao usar ferramentas ou IA. Inclui estatísticas de palavras/caracteres e um motor robusto de Desfazer/Refazer (Ctrl+Z / Ctrl+Y).

### 2. Ferramentas de Apresentação e Documentos (Suíte Corporativa) 🚀
* **📊 Modo Apresentação de Slides (Pitch)**: Gera apresentações de slides estruturadas (Problema, Solução, Recursos, ROI, Próximos Passos) a partir das notas via LLMs locais. Possui controles de navegação por teclado (`Setas`/`Espaço`/`Esc`) e um **Botão Cancelar** para abortar a geração no meio do processo.
* **⏱️ Calculadora de ROI e Produtividade**: Calcula horas economizadas no mês, percentual de redução e dias de trabalho recuperados no ano com base na frequência das tarefas. Gera um **Card de Impacto** brilhante pronto para print e solicita à IA local um briefing estratégico de 2 frases.
* **🎙️ Ata de Reunião Inteligente (Gerar Ata)**: Converte anotações, transcrições ou ditados em uma ata estruturada com Sumário Geral, Principais Decisões e uma tabela markdown contendo *Ação/Tarefa, Responsável e Prazo*.
* **📄 Exportação Avançada para PDF**: Escolha entre modelos formatados (Margens Limpas Padrão, Ata de Reunião Formal com cabeçalhos e assinatura de participantes, ou Relatório de Impacto de Segurança com ROI auto-importado) antes de imprimir ou salvar.

### 3. Ações Rápidas de IA & Assistente Conversacional 💬
* **Ações Rápidas**: `Resumir` (síntese estruturada), `Melhorar Escrita` (polimento gramatical), `Traduzir` (tradução dinâmica direta), `Extrair Tópicos` (bullets), `Expandir Assunto` (escrita de continuação inline) e `Formatação Automática` (ajuste automático de parágrafos).
* **Remoção de Raciocínio (Thinking Blocks)**: Oculta tags de pensamento (`<think>...</think>`) de modelos de raciocínio (como DeepSeek R1) para manter o chat limpo e focado no resultado.
* **Assistente Lateral**: Chat contextualizado para perguntar sobre a nota. Inclui um botão "📥 Inserir na Nota" para colar respostas diretamente na posição do cursor do editor.

### 4. Recursos de Mídia & Raspagem Web 🎙️🕸️
* **🕸️ Web Scraper (Scrapling)**: Extrai o conteúdo limpo de URLs da web (com fallback integrado), cria uma nova nota automaticamente e imprime um resumo da página no chat.
* **Resumo de Vídeos do YouTube**: Extrai e resume legendas nativas do YouTube sem chaves externas de API, caindo para raspagem de metadados se a legenda não existir.
* **🔊 Leitor de Áudio (TTS)**: Vozes neurais de alta fidelidade (Azure TTS) ou fallback via Web Speech API do navegador, com controles de velocidade e volume em um modal dedicado.

### 5. Zen Focus, Quadro Kanban & Visualização de Grafos 🧘📊📋
* **📋 Quadro Kanban Integrado**: Alterne dinamicamente entre o Editor e um Quadro Kanban interativo. As notas são classificadas automaticamente em colunas (*A Fazer*, *Em Progresso*, *Concluído* ou *Sem Status*) conforme suas tags, suportando drag-and-drop nativo para atualização de status em tempo real.
* **🧘 Modo Zen Focus & Pomodoro Timer**: Canvas minimalista livre de distrações com loops de som ambiente (Chuva, Floresta, Lo-fi) e controles de volume. Inclui um **Timer Pomodoro** flutuante no canto inferior direito com sessões configuráveis (Foco, Pausa Curta, Pausa Longa) e alarmes sonoros sintetizados.
* **Grafo de Rede (Física)**: Mapa interativo de conexões entre notas, com cores dinâmicas baseadas em Tags (Vulnerabilidade = Vermelho, Correção = Verde, Log = Laranja, Padrão = Ciano).
* **Painéis Colapsáveis (Desktop)**: Botões de setas de borda (`◀` / `▶`) para recolher a barra lateral ou painel de chat, expandindo o espaço de escrita.
* **Autocomplete Inteligente**: Sugestões de escrita inline (ghost text aceito via `Tab` ou `Seta Direita`) e autocompletar de tags por histórico.

---

## 🧠 Modelos Locais de IA Suportados
A aplicação integra-se aos runners locais e recarrega modelos automaticamente em caso de inatividade (TTL). O dropdown de seleção suporta:
- **Qwen 3 (0.6B) - Ultraleve** (`qwen3-0.6b`): Rápido e de baixo consumo.
- **Qwen 3.5 (2B) - Equilibrado** (`qwen3.5-2b-text`): Equilíbrio excelente entre velocidade e lógica.
- **Phi-4-mini (4B) - Avançado** (`phi-4-mini`): Modelo padrão, altamente capaz e inteligente.
- **DeepSeek R1 (1.5B) - Raciocínio Leve** (`deepseek-r1-1.5b`): Raciocínio rápido.
- **DeepSeek R1 (7B) - Raciocínio Pro** (`deepseek-r1-7b`): Raciocínio forte e estabilidade em português.
- **Mistral Nemo (12B) - Redação & Ata** (`mistral-nemo-12b-instruct`): Excelente redação formal e grande janela de contexto.
- **GPT-OSS (20B) - GPU Pesado** (`gpt-oss-20b`): Processamento pesado em GPU.

---

## 🛠️ Arquitetura e Estrutura do Projeto

```text
smartnotes-ai/
├── public/                 # Pasta pública contendo os arquivos do Frontend
│   ├── index.html          # Interface visual (HTML5 semântico com hooks i18n)
│   ├── style.css           # Estilos e design system (CSS3 comentado em inglês)
│   ├── app.js              # Lógica do app, i18n, controle de seleção e chamadas de API
│   └── *.mp3               # Loops de som ambiente para o Zen Focus Mode
├── .env.example            # Exemplo de arquivo de configuração de ambiente
├── .gitignore              # Ignora arquivos de ambiente local e dependências
├── iniciar_servidor.bat    # Script em lote para inicialização rápida no Windows
├── package.json            # Manifesto do projeto e dependências do Node.js
├── scraper.py              # Script em Python do raspador web utilizando Scrapling
├── server.js               # Servidor backend Express (Scraper do YouTube e IA Router)
├── README.md               # Documentação principal em inglês
└── README.pt-BR.md         # Esta documentação traduzida para Português
```

---

## 🚀 Guia de Instalação e Execução

### Pré-requisitos (Guia de Instalação via CLI)

Você precisará do **Node.js**, **Python** e **Foundry Local AI** instalados em seu sistema.

#### 1. Windows (PowerShell / Prompt de Comando)
```powershell
# Instalar Node.js (LTS), Python 3 e Foundry Local AI
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3
winget install Microsoft.FoundryLocal

# NOTA: Reinicie a janela do seu terminal para atualizar a variável PATH do sistema.
```

#### 2. macOS (Terminal - usando Homebrew)
```bash
# Instalar Node.js, Python 3 e Foundry Local AI
brew install node python
brew tap microsoft/foundrylocal
brew install foundrylocal
```

#### 3. Linux (Terminal - ex: Ubuntu/Debian)
```bash
# 1. Instalar Node.js e Python 3 + Pip (ignora erros de SSL caso esteja atrás de proxy)
curl -fsSL -k https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs python3 python3-pip

# 2. Baixar e extrair a CLI do Foundry Local (para ARM64, substitua 'x64' por 'arm64')
curl -L -O -k https://github.com/microsoft/Foundry-Local/releases/download/cli-preview-0.10.1/foundry-0.10.1-linux-x64.tar.gz
mkdir -p "$HOME/foundry-local"
tar -xzf foundry-0.10.1-linux-x64.tar.gz -C "$HOME/foundry-local" --strip-components=1

# 3. Adicionar o caminho ao perfil e atualizar sessão (use ~/.zshrc se usar zsh)
echo 'export PATH="$HOME/foundry-local/lib:$PATH"' >> ~/.bashrc
export PATH="$HOME/foundry-local/lib:$PATH" && hash -r

# 4. Verificar a instalação
foundry --version
```

### Passo 1: Configurar a IA Local (Foundry)
Configure o Foundry para escutar na porta `3000` e inicie o serviço:
```powershell
# Altera a porta padrão do Foundry para 3000
foundry config set port 3000

# Inicia o servidor local do Foundry
foundry server start
```

### Passo 2: Configurar o Projeto
1. Clone ou baixe os arquivos da aplicação.
2. Abra um terminal na pasta raiz do projeto e instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto (ou copie o `.env.example`) e ajuste as portas se necessário:
   ```env
   PORT=3001
   FOUNDRY_API_URL=http://127.0.0.1:3000/v1/chat/completions
   ```

### Passo 3: Executar o Aplicativo
#### Opção A (Windows - Recomendado)
Apenas dê **dois cliques** no arquivo **`iniciar_servidor.bat`** na raiz do projeto. Ele abrirá uma janela de terminal executando o servidor Express de forma persistente.

#### Opção B (Terminal)
No seu terminal favorito, execute o script de inicialização do Node:
```bash
npm start
```

### Passo 4: Acessar no Navegador
- O servidor Express serve os arquivos de frontend automaticamente em: **`http://localhost:3001`** (ou próxima porta disponível).
- Se preferir rodar via **Live Server** na porta `5500`, o navegador fará chamadas CORS automáticas e transparentes para a porta `3001`.

---

## 🔒 Privacidade e Segurança Corporativa
Por rodar inteiramente de forma local, **nenhuma informação escrita nas notas ou enviada ao chat sai do computador do usuário**. Isso torna o projeto perfeito para uso profissional em empresas que lidam com dados confidenciais sob políticas restritas de governança e LGPD, onde o envio de dados para serviços de nuvem de terceiros (como OpenAI ou Claude) é proibido.

const fs = require('fs');
const path = require('path');

// Dictionary of translations for codebase files (comments, console logs, descriptions, scripts)
const fileMaps = {
  'backend/server.js': [
    {
      en: "// Parse incoming request bodies in JSON format",
      pt: "// Analisa corpos de requisição recebidos no formato JSON"
    },
    {
      en: "// CORS middleware to allow requests from local developers (e.g. Live Server on 5500) or file:///",
      pt: "// Middleware CORS para permitir requisições de desenvolvedores locais (ex: Live Server na 5500) ou file:///"
    },
    {
      en: "// Serve static frontend assets (HTML, CSS, JS) from the 'public' folder",
      pt: "// Serve arquivos estáticos do frontend (HTML, CSS, JS) da pasta 'public'"
    },
    {
      en: "// Local AI Endpoint mapping to Foundry Local daemon URL",
      pt: "// Mapeamento do Endpoint de IA Local para a URL do daemon do Foundry Local"
    },
    {
      en: "// Helper function to scrape YouTube video transcript natively",
      pt: "// Função utilitária para extrair transcrição de vídeo do YouTube nativamente"
    },
    {
      en: "// Find the ytInitialPlayerResponse payload on the page",
      pt: "// Encontra o payload do ytInitialPlayerResponse na página"
    },
    {
      en: "// Look for Portuguese (pt) or English (en) captions, fallback to first track",
      pt: "// Procura legendas em inglês (en) ou português (pt), retrocedendo para a primeira faixa"
    },
    {
      en: "// Parse XML tags to pull plain text lines",
      pt: "// Analisa tags XML para extrair linhas de texto simples"
    },
    {
      en: "// GET route to obtain a video's transcript",
      pt: "// Rota GET para obter a transcrição de um vídeo"
    },
    {
      en: "// Extract video ID from URL",
      pt: "// Extrai o ID do vídeo a partir da URL"
    },
    {
      en: "// POST route to communicate with local AI",
      pt: "// Rota POST para se comunicar com a IA local"
    },
    {
      en: "// Map model selection to actual IDs loaded in Foundry Local",
      pt: "// Mapeia a seleção do modelo para os IDs reais carregados no Foundry Local"
    },
    {
      en: "// If model is not loaded, attempt auto-loading",
      pt: "// Se o modelo não estiver carregado, tenta o carregamento automático"
    },
    {
      en: "// Retry original request",
      pt: "// Tenta novamente a requisição original"
    },
    {
      en: "// Return only content, stripping any thinking blocks (<think>...</think>)",
      pt: "// Retorna apenas o conteúdo, removendo quaisquer blocos de pensamento (<think>...</think>)"
    },
    {
      en: "// Start Express HTTP Server",
      pt: "// Inicia o Servidor HTTP Express"
    },
    {
      en: "[Backend] Subtitles unavailable for video ${videoId}. Returning metadata.",
      pt: "[Backend] Legendas indisponíveis para o vídeo ${videoId}. Retornando metadados."
    },
    {
      en: "[Backend] Failed to download subtitles for ${videoId}. Using metadata.",
      pt: "[Backend] Falha ao baixar legendas para ${videoId}. Usando metadados."
    },
    {
      en: "[Backend] Fetching transcript for video ID: ${videoId}...",
      pt: "[Backend] Buscando transcrição para o ID de vídeo: ${videoId}..."
    },
    {
      en: "[Backend] Error getting YouTube transcript:",
      pt: "[Backend] Erro ao obter transcrição do YouTube:"
    },
    {
      en: "[Backend] Sending request to Foundry Local (${targetModel})...",
      pt: "[Backend] Enviando requisição para o Foundry Local (${targetModel})..."
    },
    {
      en: "[Backend] Model ${targetModel} is not loaded. Loading dynamically...",
      pt: "[Backend] O modelo ${targetModel} não está carregado. Carregando dinamicamente..."
    },
    {
      en: "[Backend] Model ${targetModel} loaded successfully! Retrying request...",
      pt: "[Backend] Modelo ${targetModel} carregado com sucesso! Tentando novamente a requisição..."
    },
    {
      en: "[Backend] Local AI Error:",
      pt: "[Backend] Erro na IA local:"
    },
    {
      en: "🚀 SmartNotes AI is running!",
      pt: "🚀 SmartNotes AI está rodando!"
    },
    {
      en: "👉 Open in browser: http://localhost",
      pt: "👉 Abra no navegador: http://localhost"
    },
    {
      en: "🔗 Connected to Foundry Local on:",
      pt: "🔗 Conectado ao Foundry Local em:"
    },
    {
      en: "// POST route to extract text from an uploaded PDF (received as base64 in body)",
      pt: "// Rota POST para extrair texto de um PDF enviado (recebido como base64 no corpo)"
    },
    {
      en: "[Backend] Processing uploaded PDF file...",
      pt: "[Backend] Processando arquivo PDF enviado..."
    },
    {
      en: "[Backend] PDF parsed successfully! Extracted ${data.text.length} characters.",
      pt: "[Backend] PDF analisado com sucesso! Extraídos ${data.text.length} caracteres."
    },
    {
      en: "Failed to extract text from PDF. Ensure the file is not password-protected.",
      pt: "Falha ao extrair texto do PDF. Certifique-se de que o arquivo não está protegido por senha."
    },
    {
      en: "// Polyfill DOMMatrix for pdf-parse environment compatibility in Node.js",
      pt: "// Polyfill DOMMatrix para compatibilidade do pdf-parse em ambiente Node.js"
    }
  ],
  'public/app.js': [
    {
      en: "// --- APPLICATION STATE ---",
      pt: "// --- ESTADO DA APLICAÇÃO ---"
    },
    {
      en: "// Stores the active selection range to prevent focus loss",
      pt: "// Armazena o intervalo de seleção ativo para evitar perda de foco"
    },
    {
      en: "// Default language is English (en)",
      pt: "// O idioma padrão é o inglês (en)"
    },
    {
      en: "// Translation Dictionary (i18n)",
      pt: "// Dicionário de Tradução (i18n)"
    },
    {
      en: "// Dynamically determine backend base API URL to support intranets/local network hosts",
      pt: "// Determina dinamicamente a URL base da API do backend para suportar intranets/hosts de rede local"
    },
    {
      en: "// --- DOM ELEMENTS ---",
      pt: "// --- ELEMENTOS DO DOM ---"
    },
    {
      en: "// --- APPLICATION INITIALIZATION ---",
      pt: "// --- INICIALIZAÇÃO DA APLICAÇÃO ---"
    },
    {
      en: "// Sync initial language settings",
      pt: "// Sincroniza as configurações de idioma iniciais"
    },
    {
      en: "// --- THEME AND NOTE STORAGE MANAGEMENT ---",
      pt: "// --- GERENCIAMENTO DE TEMA E ARMAZENAMENTO DE NOTAS ---"
    },
    {
      en: "// Update active styling in sidebar list",
      pt: "// Atualiza o estilo ativo na lista da sidebar"
    },
    {
      en: "// Avoid selecting the note when clicking delete",
      pt: "// Evita selecionar a nota ao clicar em excluir"
    },
    {
      en: "// --- SIDEBAR UI RENDERER ---",
      pt: "// --- RENDERIZADOR DA UI DA SIDEBAR ---"
    },
    {
      en: "// --- EVENT LISTENERS ---",
      pt: "// --- OUVINTES DE EVENTOS ---"
    },
    {
      en: "// Auto-save on typing title or content",
      pt: "// Salva automaticamente ao digitar o título ou conteúdo"
    },
    {
      en: "// Selection Range Listeners inside rich editor",
      pt: "// Ouvintes de Intervalo de Seleção dentro do editor rich text"
    },
    {
      en: "// Rich Text Formatting Buttons",
      pt: "// Botões de Formatação de Rich Text"
    },
    {
      en: "// Skip custom color action buttons",
      pt: "// Pula botões de ação de cores personalizadas"
    },
    {
      en: "// Retain editor selection focus",
      pt: "// Mantém o foco de seleção do editor"
    },
    {
      en: "// Trigger native color selector",
      pt: "// Aciona o seletor de cores nativo"
    },
    {
      en: "// Text Color Custom Button",
      pt: "// Botão Personalizado de Cor de Texto"
    },
    {
      en: "// Text Highlight Color Custom Button",
      pt: "// Botão Personalizado de Cor de Destaque de Texto"
    },
    {
      en: "// AI Toolbar Action Buttons",
      pt: "// Botões de Ação da Barra de Ferramentas de IA"
    },
    {
      en: "// Retain editor selection",
      pt: "// Mantém a seleção do editor"
    },
    {
      en: "// Assistant Chat Sender",
      pt: "// Envio de Chat do Assistente"
    },
    {
      en: "// Clear Chat Button",
      pt: "// Botão de Limpar Chat"
    },
    {
      en: "// --- LOCAL AI CONNECTOR BRIDGE ---",
      pt: "// --- PONTE DE CONEXÃO COM A IA LOCAL ---"
    },
    {
      en: "// Handles toolbar AI quick actions (summarize, improve, translate, etc.)",
      pt: "// Trata ações rápidas de IA da barra de ferramentas (resumir, melhorar, traduzir, etc.)"
    },
    {
      en: "// Sends chat messaging with current note text attached as reference context",
      pt: "// Envia mensagem de chat com o texto da nota atual anexado como contexto de referência"
    },
    {
      en: "// --- CHAT INTERACTION HELPERS ---",
      pt: "// --- AUXILIARES DE INTERAÇÃO DO CHAT ---"
    },
    {
      en: "// --- YOUTUBE SUMMARY ROUTINE ---",
      pt: "// --- ROTINA DE RESUMO DO YOUTUBE ---"
    },
    {
      en: "// --- DIALOGS AND CUSTOM PREMIUM NOTIFICATION SYSTEM (TOASTS) ---",
      pt: "// --- DIÁLOGOS E SISTEMA PREMIUM DE NOTIFICAÇÕES (TOASTS) ---"
    },
    {
      en: "// --- UTILITY FORMATTING & RANGE FUNCTIONS ---",
      pt: "// --- FUNÇÕES UTILIÁRIAS DE FORMATAÇÃO E INTERVALOS ---"
    },
    {
      en: "// --- INTERNATIONALIZATION ROUTINES (i18n) ---",
      pt: "// --- ROTINAS DE INTERNACIONALIZAÇÃO (i18n) ---"
    },
    {
      en: "Requested: Topic expansion in the note...",
      pt: "Solicitado: Expansão do assunto na nota..."
    },
    {
      en: "Requested: Text summary...",
      pt: "Solicitado: Resumo do texto..."
    },
    {
      en: "Requested: Writing improvement...",
      pt: "Solicitado: Melhoria de escrita..."
    },
    {
      en: "Requested: Translation to Portuguese...",
      pt: "Solicitado: Tradução para o português..."
    },
    {
      en: "Requested: Topic extraction...",
      pt: "Solicitado: Extração de tópicos..."
    },
    {
      en: "// --- EXTENDED APPLICATION STATE ---",
      pt: "// --- ESTADO ESTENDIDO DA APLICAÇÃO ---"
    },
    {
      en: "// Zen Mode Audio Context & Nodes (Procedural Audio Synthesis)",
      pt: "// Contexto de Áudio e Nós do Modo Zen (Síntese Procedimental de Áudio)"
    },
    {
      en: "// Knowledge Graph Simulation State",
      pt: "// Estado da Simulação do Grafo de Conhecimento"
    },
    {
      en: "// --- PRODUCTIVITY ENHANCEMENTS AND NEW FEATURES LOGIC ---",
      pt: "// --- MELHORIAS DE PRODUTIVIDADE E LÓGICA DE NOVOS RECURSOS ---"
    },
    {
      en: "// 1. Stats Counter",
      pt: "// 1. Contador de Estatísticas"
    },
    {
      en: "// 2. Note Exporter",
      pt: "// 2. Exportador de Notas"
    },
    {
      en: "// 3. Tag Categorization System",
      pt: "// 3. Sistema de Categorização por Tags"
    },
    {
      en: "// 4. Zen Focus Mode",
      pt: "// 4. Modo Zen Foco"
    },
    {
      en: "// 5. Procedural Sound Synthesizer (Web Audio API)",
      pt: "// 5. Sintetizador de Som Procedimental (Web Audio API)"
    },
    {
      en: "// 6. Physics Graph Layout (Obsidian-style)",
      pt: "// 6. Layout de Grafo de Física (Estilo Obsidian)"
    },
    {
      en: "// 7. PDF Upload Handler",
      pt: "// 7. Manipulador de Upload de PDF"
    }
  ],
  'public/style.css': [
    {
      en: "SmartNotes AI - Premium Design System (Slate Gray & Neon Cyan/Teal)",
      pt: "SmartNotes AI - Sistema de Design Premium (Slate Gray & Neon Cyan/Teal)"
    },
    {
      en: "Global Configurations & Style Variables (DARK THEME - Slate Gray & Teal)",
      pt: "Configurações Globais e Variáveis de Estilo (TEMA ESCURO - Slate Gray & Teal)"
    },
    {
      en: "Variables for LIGHT THEME (Soft Slate White)",
      pt: "Variáveis para TEMA CLARO (Soft Slate White)"
    },
    {
      en: "/* --- RESET & SETUP --- */",
      pt: "/* --- RESET E CONFIGURAÇÃO --- */"
    },
    {
      en: "/* Modernized 3-Column Grid Layout */",
      pt: "/* Layout de Grade Modernizado de 3 Colunas */"
    },
    {
      en: "/* Minimalist Scrollbars with Blur Effects */",
      pt: "/* Barras de Rolagem Minimalistas com Efeitos de Blur */"
    },
    {
      en: "/* --- SIDEBAR PANEL (Left) --- */",
      pt: "/* --- PAINEL SIDEBAR (Esquerda) --- */"
    },
    {
      en: "/* --- MAIN EDITOR CANVAS (Center) --- */",
      pt: "/* --- TELA DO EDITOR PRINCIPAL (Centro) --- */"
    },
    {
      en: "/* --- CHAT ASSISTANT PANEL (Right) --- */",
      pt: "/* --- PAINEL DO ASSISTENTE DE CHAT (Direita) --- */"
    },
    {
      en: "/* --- CONFIRMATION MODAL --- */",
      pt: "/* --- MODAL DE CONFIRMAÇÃO --- */"
    },
    {
      en: "/* --- CUSTOM PREMIUM TOASTS --- */",
      pt: "/* --- TOASTS PREMIUM PERSONALIZADOS --- */"
    },
    {
      en: "Productivity Enhancements & Premium Features (PDF, Search, Tags, Zen, Graph)",
      pt: "Melhorias de Produtividade e Recursos Premium (PDF, Busca, Tags, Zen, Grafo)"
    }
  ],
  'iniciar_servidor.bat': [
    {
      en: "STARTING SMARTNOTES AI BACKEND SERVER",
      pt: "INICIANDO O SERVIDOR BACKEND DO SMARTNOTES AI"
    },
    {
      en: "The Express server will run on port 3001 and bridge",
      pt: "O servidor Express rodará na porta 3001 e fará a ponte"
    },
    {
      en: "to your local AI on port 3000.",
      pt: "para a sua IA local na porta 3000."
    },
    {
      en: "Server stopped.",
      pt: "Servidor parado."
    }
  ],
  '.env': [
    {
      en: "# Port where the SmartNotes AI Express server will run",
      pt: "# Porta onde o servidor Express do SmartNotes AI irá rodar"
    },
    {
      en: "# URL of the Local AI API (or OpenAI compatible)",
      pt: "# URL da API do Foundry Local (ou OpenAI compatível)"
    },
    {
      en: "# Change to the corresponding port if you change the port in Foundry (e.g. 11434 or 11435)",
      pt: "# Altere para a porta correspondente se mudar a porta no Foundry (ex: 11434 ou 11435)"
    }
  ],
  '.env.example': [
    {
      en: "# Port where the SmartNotes AI Express server will run",
      pt: "# Porta onde o servidor Express do SmartNotes AI irá rodar"
    },
    {
      en: "# URL of the Local AI API (or OpenAI compatible)",
      pt: "# URL da API do Foundry Local (ou OpenAI compatível)"
    },
    {
      en: "# Change to the corresponding port if you change the port in Foundry (e.g. 11434, 11435 or 3000)",
      pt: "# Altere para a porta correspondente se mudar a porta no Foundry (ex: 11434, 11435 ou 3000)"
    }
  ],
  'package.json': [
    {
      en: "\"description\": \"Intelligent notepad powered by local AI\"",
      pt: "\"description\": \"Notepad inteligente alimentado por IA local\""
    }
  ]
};

// Main translation logic
function translateProject(targetLang) {
  if (targetLang !== 'en' && targetLang !== 'pt') {
    console.error("❌ Error: Invalid language. Please choose 'en' (English) or 'pt' (Portuguese).");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🌐 Translating codebase files to: ${targetLang.toUpperCase()}`);
  console.log(`======================================================\n`);

  for (const [filename, replacements] of Object.entries(fileMaps)) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: File not found - ${filename}`);
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let changeCount = 0;

      for (const item of replacements) {
        const fromVal = targetLang === 'pt' ? item.en : item.pt;
        const toVal = targetLang === 'pt' ? item.pt : item.en;

        if (content.includes(fromVal)) {
          // Replace all occurrences of this string
          content = content.split(fromVal).join(toVal);
          changeCount++;
        }
      }

      if (changeCount > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${filename}: successfully replaced ${changeCount} strings.`);
      } else {
        console.log(`ℹ️ ${filename}: no changes needed (already in ${targetLang} or match not found).`);
      }
    } catch (err) {
      console.error(`❌ Error processing file ${filename}:`, err.message);
    }
  }

  console.log(`\n🎉 Codebase translation complete!`);
}

// Get the language from the CLI arguments (default is 'pt')
const args = process.argv.slice(2);
const lang = args[0] ? args[0].toLowerCase().replace('--lang=', '') : 'pt';

translateProject(lang);

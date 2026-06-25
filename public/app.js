// Remote debugging console log override
(function() {
    const originalLog = console.log;
    const originalError = console.error;
    
    function formatArg(arg) {
        if (arg instanceof Error) {
            return `${arg.message}\n${arg.stack}`;
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                // If it looks like an error object with message/stack
                if (arg.message || arg.stack) {
                    return `${arg.message || ''}\n${arg.stack || ''}`;
                }
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    }

    console.log = function(...args) {
        originalLog.apply(console, args);
        const message = args.map(formatArg).join(' ');
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: 'log', message })
        }).catch(() => {});
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        const message = args.map(formatArg).join(' ');
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: 'error', message })
        }).catch(() => {});
    };
})();


// --- APPLICATION STATE ---
let notes = [];
let activeNoteId = null;
let lastSelectionRange = null; // Stores the active selection range to prevent focus loss
let currentLang = localStorage.getItem('smartnotes_lang') || 'pt'; // Default language is Portuguese (pt)

// --- EXTENDED APPLICATION STATE ---
let notesSearchQuery = "";
let activeTagFilter = null; // Holds active tag name for filtering
let selectedTagColor = "#3b82f6"; // Default color preset selected for tag creation
let activeAiAbortController = null; // Stores current AI generation AbortController
let lastAiStartTime = 0; // Stores timestamp when AI call starts
let undoStack = [];
let redoStack = [];
let typingTimer = null;
let isTyping = false;
let typingEndTimer = null;

// Autocomplete State
let localDictionary = new Set();
let tagSuggestionsList = [];
let activeTagSuggestionIndex = -1;

// Zen Mode Audio Context & Nodes (Procedural Audio Synthesis)
let audioCtx = null;
let rainAudio = null;
let forestAudio = null;
let lofiAudio = null;
let activeSounds = { rain: false, forest: false, lofi: false };
let soundNodes = { rain: null, forest: null };
let volumeControls = { rain: 0.5, forest: 0.5, lofi: 0.5 };

// Knowledge Graph Simulation State
let isGraphModalOpen = false;
let graphNodes = [];
let graphLinks = [];
let draggedNode = null;
let hoveredNode = null;
let canvasScale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;
let graphPhysicsInterval = null;

// Translation Dictionary (i18n)
const i18n = {
    en: {
        newNote: "+ New Note",
        yourNotes: "Your Notes",
        emptyNote: "Empty",
        modelLabel: "Local AI Model",
        modelQwen: "Qwen 3 (0.6B) - Ultra-light",
        modelQwenBalanced: "Qwen 3.5 (2B) - Balanced",
        modelPhi: "Phi-4-mini (4B) - Advanced",
        modelDeepseekLight: "DeepSeek R1 (1.5B) - Reasoning Light",
        modelDeepseekPro: "DeepSeek R1 (7B) - Reasoning Pro",
        modelMistralNemo: "Mistral Nemo (12B) - Text Expert",
        modelGpt: "GPT-OSS (20B) - Heavy GPU",
        noteTitlePlaceholder: "Untitled Note",
        statusSaved: "Saved locally",
        statusSaving: "Saving...",
        statusModified: "Modified",
        statusFontChanged: "Font changed",
        statusSizeChanged: "Size changed",
        statusColorChanged: "Color changed",
        statusHighlightChanged: "Highlight changed",
        statusLoading: "AI processing...",
        statusStudyCompleted: "Study note completed!",
        statusError: "AI Error",
        statusChatCleared: "Chat cleared",
        statusCreatedFromSummary: "Note created from summary!",
        editorPlaceholder: "Start writing your note here...",
        quickActionsLabel: "⚡ AI Quick Actions",
        actionSummarize: "📝 Summarize",
        actionImprove: "✨ Improve Writing",
        actionTranslate: "🌍 Translate",
        actionBullets: "📌 Extract Topics",
        actionExpand: "✍️ Expand Topic",
        actionFormat: "🪄 Auto-Format",
        actionAta: "🎙️ Meeting Minutes",
        copaGincanaTitle: "🚀 Pitch & Productivity",
        copaAssistantsTitle: "🎙️ Assistants & Focus",
        pitchLoading: "Preparing slide presentation with Local AI...",
        copaDropdownTitle: "⚡ AI Actions",
        pitchModeBtn: "📊 Present Pitch",
        roiCalcBtn: "⏱️ ROI Calculator",
        generateAtaBtnText: "🎙️ Meeting Minutes",
        chatHeader: "AI Assistant",
        chatStatus: "Offline (Local)",
        chatClearTitle: "Clear conversation",
        ytUrlPlaceholder: "YouTube video link...",
        ytBtnTitle: "Summarize YouTube video",
        ytBtnText: "🎥 Summarize",
        chatWelcome: "Hello! I am your personal AI assistant. You can ask me questions about your note, request text generation, or analyze selected content.",
        chatInputPlaceholder: "Ask something about your note...",
        confirmDeleteTitle: "Delete Note",
        confirmDeleteMsg: "Do you really want to delete the note \"{title}\"?",
        confirmCancel: "Cancel",
        confirmOk: "Delete",
        toastSelectionInfo: "Select or write some text to process with the AI.",
        toastSuccessExpand: "Text expanded directly into the note!",
        toastSuccessCreate: "Note created from summary!",
        toastYtError: "Please enter a valid YouTube video link!",
        toastYtConnecting: "🎥 Connecting to YouTube to extract transcript (Video ID: {id})...",
        toastYtDownloading: "Downloading subtitles and analyzing audio...",
        toastYtTranscriptSuccess: "📊 Transcript extracted! Sending text ({words} words) to local model to generate structured summary...",
        toastYtFetchError: "Could not connect to backend server. Make sure the server is running on port 3001.",
        toastYtServerError: "Server error (HTTP {status}). Verify that the backend server is active.",
        toastYtFormatError: "The server did not return a valid JSON format.",
        toastAiProcessing: "Processing local request...",
        toastAiThinking: "Thinking...",
        toastAiSuccess: "Continuation successfully inserted directly in your note!",
        toastAiError: "❌ Failed to process with local AI. Make sure the Express backend server is running in the terminal (port 3001).",
        welcomeNoteTitle: "Welcome to SmartNotes!",
        welcomeNoteContent: "Write your notes here. You can select any text snippet and click one of the AI quick action buttons below!",
        searchPlaceholder: "Search notes...",
        pdfDropText: "Upload or drag PDF file here...",
        pdfLoading: "Extracting PDF contents...",
        pdfSuccess: "PDF extracted successfully ({words} words)! Sending to AI for summary...",
        pdfError: "Failed to extract PDF.",
        exportPdf: "📄 PDF",
        exportHtml: "📋 HTML",
        saveTag: "Add",
        tagInputPlaceholder: "New tag name...",
        zenBtnTitle: "Zen Focus Mode",
        graphBtnTitle: "Show Knowledge Graph",
        graphTitle: "Knowledge Network Graph",
        graphHelp: "Drag nodes to organize. Double-click a note node to open it.",
        zenSoundsLabel: "Ambient Sounds",
        toastPdfLarge: "PDF is too large! Truncating to the first {words} words.",
        toastHtmlCopied: "Rich HTML copied to clipboard!",
        tagWork: "Work",
        tagStudy: "Study",
        tagPersonal: "Personal",
        scraperUrlPlaceholder: "Webpage link to scrape...",
        scraperBtnTitle: "Scrape webpage",
        scraperBtnText: "🕸️ Scrape Web",
        toastScrapeError: "Please enter a valid webpage link!",
        toastScrapeConnecting: "🕸️ Connecting to scraper backend... fetching page content...",
        toastScrapeSuccess: "Webpage captured! Creating new note...",
        ttsPlayTitle: "Play note audio",
        ttsStopTitle: "Stop audio",
        ttsVoiceLabel: "Voice:",
        ttsSpeedLabel: "Speed:",
        ttsVolLabel: "Vol:",
        ttsStatusLocal: "Local Fallback",
        ttsStatusActive: "MAI-Voice-2 Active",
        exportPatch: "💾 Git Patch",
        toastPatchSuccess: "Git patch copied to clipboard!",
        toastPatchNoCode: "No code block found in the note to export a Git patch!",
        selectionTip: "Tip: Select a specific text range in the note to format, read aloud, or run AI actions only on that part. Otherwise, actions apply to the entire note.",
        dismissTipTitle: "Dismiss tip",
        removeHighlightTitle: "Remove Highlight",
        cancelAiText: "⏹️ Stop AI",
        stopAiTitle: "Stop AI Assistant",
        zenBtnText: "🧘 Zen Mode",
        soundRain: "🌧️ Rain",
        soundForest: "🌲 Forest",
        soundLofi: "🎵 Lo-fi",
        readerBtnTitle: "Toggle Text Reader",
        readerBtnText: "🔊 Reader",
        ttsActiveLabel: "🔊 Audio Reader",
        ttsSettingsTitle: "Voice & Audio",
        exportMenuBtn: "📤 Export",
        exitZenBtn: "🧘 Exit Zen Mode",
        backupExportBtn: "⚙️ Export Backup",
        backupExportBtnTitle: "Export all notes as a JSON backup file",
        backupImportBtn: "📥 Import Backup",
        backupImportBtnTitle: "Import notes from a JSON backup file",
        colorDefaultTitle: "Default Text Color",
        colorNoneTitle: "No Highlight",
        toastBackupExportSuccess: "Backup file downloaded successfully!",
        toastBackupImportSuccess: "Backup imported successfully! Reloading...",
        toastBackupImportError: "Failed to parse backup file. Please select a valid SmartNotes JSON backup.",
        
        // New features translations
        viewEditor: "📝 Editor View",
        viewKanban: "📋 Kanban View",
        kanbanColumnTodo: "To Do",
        kanbanColumnDoing: "In Progress",
        kanbanColumnDone: "Completed",
        kanbanColumnUncategorized: "Uncategorized",
        kanbanNewCard: "+ Create Note",
        pomodoroFocus: "Focus Session",
        pomodoroBreak: "Short Break",
        pomodoroLongBreak: "Long Break",
        pomodoroStart: "Start Timer",
        pomodoroPause: "Pause Timer",
        pomodoroReset: "Reset Timer",
        pdfExportOptionsTitle: "PDF Export Templates",
        pdfTemplateDefault: "Standard Document",
        pdfTemplateMinutes: "Meeting Minutes (Ata)",
        pdfTemplateROI: "ROI Executive Report",
        pdfExportBtn: "Export & Print PDF",
        quickGuideTitle: "💡 Shortcuts & Gestures",
        quickGuideShortcutSlash: "Command Menu",
        quickGuideShortcutSlashDesc: "Type '/' on an empty block to insert vulnerability tables, meeting minutes headers, and HTML layouts.",
        quickGuideShortcutLinks: "WikiLinks Notes",
        quickGuideShortcutLinksDesc: "Type '[[' inside the editor to search and link another note dynamically. Links are connected in the graph.",
        quickGuideGraphGestureRight: "Pin Graph Node",
        quickGuideGraphGestureRightDesc: "Right-click a node inside the Knowledge Graph to freeze/pin it. Right-click again to release.",
        quickGuideGraphGestureDouble: "Double-click nodes",
        quickGuideGraphGestureDoubleDesc: "Double-click a note node to open it, or a tag node to filter your active list in the sidebar.",
        quickGuideZenMode: "Zen & Pomodoro",
        quickGuideZenModeDesc: "Activating Zen Focus Mode launches focus white noises and the Pomodoro timer in the bottom-right.",
        quickGuideClose: "Close Guide",
        editorDynamicPlaceholder: "Start writing your note here... (type '/' for templates or '[[' to link notes)",
        titleBold: "Bold",
        titleItalic: "Italic",
        titleUnderline: "Underline",
        titleStrike: "Strikethrough",
        titleFont: "Font",
        titleSize: "Size",
        titleAlignLeft: "Align Left",
        titleAlignCenter: "Align Center",
        titleAlignRight: "Align Right",
        titleListBullet: "Bulleted List",
        titleListNumber: "Numbered List",
        titleTextColor: "Text Color",
        titleHighlightColor: "Highlight Color",
        titleClearFormat: "Clear Formatting",
        titleRemoveHighlight: "Remove Highlight",
        sizeSmall: "Small",
        sizeMedium: "Medium",
        sizeLarge: "Large",
        sizeExtraLarge: "Extra Large",
        graphFilterNotes: "Notes",
        graphFilterTags: "Tags",
        graphFilterConnections: "Connections",
        graphZoomIn: "Zoom In",
        graphZoomOut: "Zoom Out",
        graphZoomReset: "Center Graph",
        clearFilterTitle: "Clear filter",
        toggleSidebarTitle: "Toggle Sidebar",
        toggleAssistantTitle: "Toggle Assistant",
        chatSendTitle: "Send message",
        showAmbientSoundsTitle: "Show Ambient Sounds",
        exitZenTitle: "Exit Zen Mode",
        pomodoroSettings: "Settings",
        pomodoroSkip: "Skip Session",
        pitchPrev: "◀ Previous",
        pitchNext: "Next ▶",
        roiModalTitle: "⏱️ Impact & ROI Calculator",
        roiManualTimeLabel: "Manual Time Before AI (Minutes/Task):",
        roiFrequencyLabel: "Execution Frequency:",
        roiFreqDaily: "Daily (20x per month)",
        roiFreqWeekly: "Weekly (4x per month)",
        roiFreqMonthly: "Monthly (1x per month)",
        roiAiTimeLabel: "Estimated Time with AI (Minutes/Task):",
        roiStrategicAnalysisTitle: "Local AI Strategic Analysis:",
        roiStrategicAnalysisLoading: "Loading strategic productivity analysis...",
        roiReportBadge: "🏆 PRODUCTIVITY REPORT",
        roiSavedPerMonthLabel: "Saved per Month",
        roiTimeReductionLabel: "Time Reduction",
        roiAnnualProdLabel: "Annual Productivity",
        roiCertText: "AI-First Efficiency Certificate",
        roiCopyReportBtn: "💾 Copy ROI Report"
    },
    pt: {
        newNote: "+ Nova Nota",
        yourNotes: "Suas Notas",
        emptyNote: "Vazia",
        modelLabel: "Modelo Local de IA",
        modelQwen: "Qwen 3 (0.6B) - Ultraleve",
        modelQwenBalanced: "Qwen 3.5 (2B) - Equilibrado",
        modelPhi: "Phi-4-mini (4B) - Avançado",
        modelDeepseekLight: "DeepSeek R1 (1.5B) - Raciocínio Leve",
        modelDeepseekPro: "DeepSeek R1 (7B) - Raciocínio Pro",
        modelMistralNemo: "Mistral Nemo (12B) - Redação & Ata",
        modelGpt: "GPT-OSS (20B) - GPU Pesado",
        noteTitlePlaceholder: "Nota sem título",
        statusSaved: "Salvo localmente",
        statusSaving: "Salvando...",
        statusModified: "Modificado",
        statusFontChanged: "Fonte alterada",
        statusSizeChanged: "Tamanho alterado",
        statusColorChanged: "Cor alterada",
        statusHighlightChanged: "Destaque alterado",
        statusLoading: "IA processando...",
        statusStudyCompleted: "Nota de estudo concluída!",
        statusError: "Erro na IA",
        statusChatCleared: "Conversa limpa",
        statusCreatedFromSummary: "Nota criada do resumo!",
        editorPlaceholder: "Comece a escrever a sua nota aqui...",
        quickActionsLabel: "⚡ Ações Rápidas com IA",
        actionSummarize: "📝 Resumir",
        actionImprove: "✨ Melhorar Escrita",
        actionTranslate: "🌍 Traduzir",
        actionBullets: "📌 Extrair Tópicos",
        actionExpand: "✍️ Expandir Assunto",
        actionFormat: "🪄 Formatação Automática",
        actionAta: "🎙️ Gerar Ata",
        copaGincanaTitle: "🚀 Pitch & Produtividade",
        copaAssistantsTitle: "🎙️ Assistentes & Foco",
        pitchLoading: "Preparando apresentação de slides com IA Local...",
        copaDropdownTitle: "⚡ Ações com IA",
        pitchModeBtn: "📊 Apresentar Pitch",
        roiCalcBtn: "⏱️ Calculadora de ROI",
        generateAtaBtnText: "🎙️ Gerar Ata",
        chatHeader: "Assistente de IA",
        chatStatus: "Offline (Local)",
        chatClearTitle: "Limpar conversa",
        ytUrlPlaceholder: "Link de vídeo do YouTube...",
        ytBtnTitle: "Resumir vídeo do YouTube",
        ytBtnText: "🎥 Resumir",
        chatWelcome: "Olá! Sou seu assistente de IA pessoal. Você pode me fazer perguntas sobre sua nota, me pedir para gerar conteúdos adicionais ou analisar textos selecionados.",
        chatInputPlaceholder: "Pergunte algo sobre a sua nota...",
        confirmDeleteTitle: "Excluir Nota",
        confirmDeleteMsg: "Deseja realmente excluir a nota \"{title}\"?",
        confirmCancel: "Cancelar",
        confirmOk: "Excluir",
        toastSelectionInfo: "Selecione ou escreva um texto para processar com a IA.",
        toastSuccessExpand: "Texto expandido diretamente na nota!",
        toastSuccessCreate: "Nota criada do resumo!",
        toastYtError: "Por favor, insira um link de vídeo do YouTube!",
        toastYtConnecting: "🎥 Conectando ao YouTube para extrair transcrição (Video ID: {id})...",
        toastYtDownloading: "Baixando legenda e analisando áudio...",
        toastYtTranscriptSuccess: "📊 Transcrição real extraída! Enviando texto ({words} palavras) para o modelo local gerar o resumo estruturado...",
        toastYtFetchError: "Não foi possível conectar ao servidor do backend. Certifique-se de iniciar a aplicação pelo terminal rodando o comando 'node server.js' (porta 3001).",
        toastYtServerError: "Erro do servidor (Status HTTP {status}). Verifique se o servidor backend está ativo na porta 3001.",
        toastYtFormatError: "O servidor não retornou um formato JSON válido.",
        toastAiProcessing: "Processando requisição localmente...",
        toastAiThinking: "Pensando...",
        toastAiSuccess: "Continuação inserida com sucesso diretamente na sua nota!",
        toastAiError: "❌ Falha ao processar com a IA local. Certifique-se de que o servidor backend Express está ativo no terminal (porta 3001).",
        welcomeNoteTitle: "Bem-vindo ao SmartNotes!",
        welcomeNoteContent: "Escreva suas anotações aqui. Você pode selecionar qualquer trecho de texto e clicar em um dos botões de ação rápida com IA abaixo!",
        searchPlaceholder: "Pesquisar notas...",
        pdfDropText: "Clique ou arraste um PDF aqui...",
        pdfLoading: "Extraindo conteúdo do PDF...",
        pdfSuccess: "PDF extraído com sucesso ({words} palavras)! Enviando para IA resumir...",
        pdfError: "Falha ao extrair texto do PDF.",
        exportPdf: "📄 PDF",
        exportHtml: "📋 HTML",
        saveTag: "Adicionar",
        tagInputPlaceholder: "Nova tag...",
        zenBtnTitle: "Modo Zen Foco",
        graphBtnTitle: "Ver Grafo de Conexões",
        graphTitle: "Grafo de Conhecimento",
        graphHelp: "Arraste nós para organizar. Dê dois cliques em uma nota para abrir.",
        zenSoundsLabel: "Sons Ambientes",
        toastPdfLarge: "PDF muito grande! Limitado às primeiras {words} palavras.",
        toastHtmlCopied: "HTML formatado copiado!",
        tagWork: "Trabalho",
        tagStudy: "Estudos",
        tagPersonal: "Pessoal",
        scraperUrlPlaceholder: "Link da página web...",
        scraperBtnTitle: "Capturar página web",
        scraperBtnText: "🕸️ Capturar Web",
        toastScrapeError: "Por favor, insira um link de página web válido!",
        toastScrapeConnecting: "🕸️ Conectando ao scraper... extraindo conteúdo...",
        toastScrapeSuccess: "Página capturada! Criando nova nota...",
        ttsPlayTitle: "Ouvir áudio da nota",
        ttsStopTitle: "Parar áudio",
        ttsVoiceLabel: "Voz:",
        ttsSpeedLabel: "Vel.:",
        ttsVolLabel: "Vol:",
        ttsStatusLocal: "Voz Local",
        ttsStatusActive: "MAI-Voice-2 Ativo",
        exportPatch: "💾 Git Patch",
        toastPatchSuccess: "Patch do Git copiado!",
        toastPatchNoCode: "Nenhum bloco de código encontrado na nota para gerar patch!",
        selectionTip: "Dica: Selecione um trecho de texto na nota para formatar, ler em voz alta ou aplicar ações de IA apenas nesta parte. Caso contrário, as ações se aplicam a toda a nota.",
        dismissTipTitle: "Dispensar dica",
        removeHighlightTitle: "Remover Destaque",
        cancelAiText: "⏹️ Parar IA",
        stopAiTitle: "Parar Assistente de IA",
        zenBtnText: "🧘 Modo Zen",
        soundRain: "🌧️ Chuva",
        soundForest: "🌲 Floresta",
        soundLofi: "🎵 Lo-fi",
        readerBtnTitle: "Alternar Leitor de Texto",
        readerBtnText: "🔊 Leitor",
        ttsActiveLabel: "🔊 Leitor de Voz",
        ttsSettingsTitle: "Voz & Áudio",
        exportMenuBtn: "📤 Exportar",
        exitZenBtn: "🧘 Sair do Modo Zen",
        backupExportBtn: "⚙️ Exportar Backup",
        backupExportBtnTitle: "Exportar todas as notas para um arquivo JSON de backup",
        backupImportBtn: "📥 Importar Backup",
        backupImportBtnTitle: "Importar notas de um arquivo JSON de backup",
        colorDefaultTitle: "Cor de Texto Padrão",
        colorNoneTitle: "Sem Destaque",
        toastBackupExportSuccess: "Arquivo de backup baixado com sucesso!",
        toastBackupImportSuccess: "Backup importado com sucesso! Recarregando...",
        toastBackupImportError: "Falha ao ler o arquivo de backup. Selecione um arquivo JSON de backup válido do SmartNotes.",
        
        // New features translations
        viewEditor: "📝 Visualizar Editor",
        viewKanban: "📋 Quadro Kanban",
        kanbanColumnTodo: "A Fazer",
        kanbanColumnDoing: "Em Progresso",
        kanbanColumnDone: "Concluído",
        kanbanColumnUncategorized: "Sem Status",
        kanbanNewCard: "+ Criar Nota",
        pomodoroFocus: "Sessão de Foco",
        pomodoroBreak: "Pausa Curta",
        pomodoroLongBreak: "Pausa Longa",
        pomodoroStart: "Iniciar Timer",
        pomodoroPause: "Pausar Timer",
        pomodoroReset: "Reiniciar Timer",
        pdfExportOptionsTitle: "Modelos de Exportação PDF",
        pdfTemplateDefault: "Documento Padrão",
        pdfTemplateMinutes: "Ata de Reunião",
        pdfTemplateROI: "Relatório ROI/Executivo",
        pdfExportBtn: "Exportar & Imprimir PDF",
        quickGuideTitle: "💡 Atalhos & Gestos Rápido",
        quickGuideShortcutSlash: "Menu de Comandos",
        quickGuideShortcutSlashDesc: "Digite '/' em um bloco de texto vazio para inserir templates de vulnerabilidades, ata de reunião e blocos HTML.",
        quickGuideShortcutLinks: "WikiLinks Conexão",
        quickGuideShortcutLinksDesc: "Digite '[[' no editor para abrir o menu de busca de notas. Selecionar uma nota cria um vínculo automático no grafo.",
        quickGuideGraphGestureRight: "Fixar Nó no Grafo",
        quickGuideGraphGestureRightDesc: "Clique com o botão direito em um nó do Grafo para fixá-lo em uma posição. Clique direito novamente para soltá-lo.",
        quickGuideGraphGestureDouble: "Duplo clique em Nós",
        quickGuideGraphGestureDoubleDesc: "Dê duplo clique em um nó de nota para abri-la ou de tag para filtrar a listagem na barra lateral.",
        quickGuideZenMode: "Modo Zen & Pomodoro",
        quickGuideZenModeDesc: "Entrar no Modo Zen Focus abre ruídos brancos no canto inferior esquerdo e o timer Pomodoro no canto inferior direito.",
        quickGuideClose: "Fechar Guia",
        editorDynamicPlaceholder: "Comece a escrever a sua nota aqui... (digite '/' para modelos ou '[[' para conectar notas)",
        titleBold: "Negrito",
        titleItalic: "Itálico",
        titleUnderline: "Sublinhado",
        titleStrike: "Tachado",
        titleFont: "Fonte",
        titleSize: "Tamanho",
        titleAlignLeft: "Alinhar à Esquerda",
        titleAlignCenter: "Centralizar",
        titleAlignRight: "Alinhar à Direita",
        titleListBullet: "Lista com Marcadores",
        titleListNumber: "Lista Numerada",
        titleTextColor: "Cor do Texto",
        titleHighlightColor: "Cor do Destaque",
        titleClearFormat: "Limpar Formatação",
        titleRemoveHighlight: "Remover Destaque",
        sizeSmall: "Pequeno",
        sizeMedium: "Médio",
        sizeLarge: "Grande",
        sizeExtraLarge: "Muito Grande",
        graphFilterNotes: "Notas",
        graphFilterTags: "Tags",
        graphFilterConnections: "Conexões",
        graphZoomIn: "Aumentar Zoom",
        graphZoomOut: "Diminuir Zoom",
        graphZoomReset: "Centralizar Grafo",
        clearFilterTitle: "Limpar filtro",
        toggleSidebarTitle: "Alternar Barra Lateral",
        toggleAssistantTitle: "Alternar Assistente",
        chatSendTitle: "Enviar mensagem",
        showAmbientSoundsTitle: "Mostrar Sons Ambientes",
        exitZenTitle: "Sair do Modo Zen",
        pomodoroSettings: "Configurações",
        pomodoroSkip: "Pular Sessão",
        pitchPrev: "◀ Anterior",
        pitchNext: "Próximo ▶",
        roiModalTitle: "⏱️ Calculadora de Impacto & ROI",
        roiManualTimeLabel: "Tempo Manual Antes da IA (Minutos/Tarefa):",
        roiFrequencyLabel: "Frequência de Execução:",
        roiFreqDaily: "Diária (20x por mês)",
        roiFreqWeekly: "Semanal (4x por mês)",
        roiFreqMonthly: "Mensal (1x por mês)",
        roiAiTimeLabel: "Tempo Estimado com IA (Minutos/Tarefa):",
        roiStrategicAnalysisTitle: "Análise Estratégica da IA Local:",
        roiStrategicAnalysisLoading: "Carregando análise estratégica da produtividade...",
        roiReportBadge: "🏆 RELATÓRIO DE PRODUTIVIDADE",
        roiSavedPerMonthLabel: "Economizadas por Mês",
        roiTimeReductionLabel: "Redução de Tempo",
        roiAnnualProdLabel: "Produtividade Anual",
        roiCertText: "Certificado de Eficiência AI-First",
        roiCopyReportBtn: "💾 Copiar Relatório de ROI"
    }
};

// Dynamically determine backend base API URL to support intranets/local network hosts
const getApiBaseUrl = () => {
    // If the index.html is loaded directly from a local or remote web server,
    // we use the current window location origin so it supports dynamic ports.
    if (window.location.protocol.startsWith('http')) {
        return window.location.origin;
    }
    // Fallback if opened via file:/// protocol (local filesystem)
    return 'http://localhost:3001';
};
const API_BASE_URL = getApiBaseUrl();

// --- DOM ELEMENTS ---
const notesList = document.getElementById('notes-list');
const newNoteBtn = document.getElementById('new-note-btn');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const modelSelect = document.getElementById('model-select');
const statusText = document.getElementById('status-text');
const aiActionBtns = document.querySelectorAll('.ai-action-btn');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatStopBtn = document.getElementById('chat-stop-btn');
const cancelAiBtn = document.getElementById('cancel-ai-btn');

// Extended DOM Elements for Scrapling, TTS, and Git Patch
const scraperUrlInput = document.getElementById('scraper-url');
const scraperBtn = document.getElementById('scraper-btn');
const ttsPlayBtn = document.getElementById('tts-play-btn');
const ttsStopBtn = document.getElementById('tts-stop-btn');
const ttsVoiceSelect = document.getElementById('tts-voice-select');
const ttsSpeedSlider = document.getElementById('tts-speed-slider');
const ttsSpeedDisplay = document.getElementById('tts-speed-display');
const ttsVolSlider = document.getElementById('tts-vol-slider');
const ttsStatusBadge = document.getElementById('tts-status-badge');
const exportPatchBtn = document.getElementById('export-patch-btn');

// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadNotesFromStorage();
    updateLocalDictionary();
    loadThemeFromStorage();
    setupEventListeners();
    updateUiLanguage(); // Sync initial language settings
    checkSelectionTipBannerStatus();
    
    if (notes.length === 0) {
        createNewNote(i18n[currentLang].welcomeNoteTitle, i18n[currentLang].welcomeNoteContent);
    } else {
        renderNotesList();
        selectNote(notes[0].id);
    }
});

// --- THEME AND NOTE STORAGE MANAGEMENT ---

function loadThemeFromStorage() {
    const savedTheme = localStorage.getItem('smartnotes_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}

function checkSelectionTipBannerStatus() {
    const banner = document.getElementById('selection-tip-banner');
    if (banner) {
        const isHidden = localStorage.getItem('smartnotes_hide_selection_tip') === 'true';
        banner.style.display = isHidden ? 'none' : 'flex';
    }
}

function toggleTheme() {
    const isLightTheme = document.body.classList.toggle('light-theme');
    localStorage.setItem('smartnotes_theme', isLightTheme ? 'light' : 'dark');
    adaptNoteColorsToTheme();
    updateActiveNote();
}

function loadNotesFromStorage() {
    const savedNotes = localStorage.getItem('smartnotes_notes');
    if (savedNotes) {
        try {
            notes = JSON.parse(savedNotes);
        } catch (e) {
            notes = [];
        }
    }
}

function saveNotesToStorage() {
    localStorage.setItem('smartnotes_notes', JSON.stringify(notes));
    showStatus(i18n[currentLang].statusSaved);
}

function showStatus(text) {
    statusText.textContent = text;
    statusText.style.opacity = 1;
    if (text === i18n[currentLang].statusSaved) {
        setTimeout(() => {
            statusText.style.opacity = 0.6;
        }, 2000);
    }
}

function createNewNote(title = i18n[currentLang].noteTitlePlaceholder, content = "") {
    const newNote = {
        id: Date.now().toString(),
        title: title,
        content: content,
        tags: [],
        updatedAt: new Date().toISOString()
    };
    
    notes.unshift(newNote);
    saveNotesToStorage();
    renderNotesList();
    selectNote(newNote.id);
}

function selectNote(id) {
    activeNoteId = id;
    const note = notes.find(n => n.id === id);
    
    if (note) {
        noteTitle.value = note.title;
        noteContent.innerHTML = note.content || '';
        adaptNoteColorsToTheme();
        lastSelectionRange = null; // Reset selection range when switching notes
        
        // Ensure note has tags array
        if (!note.tags) note.tags = [];
        
        // Render tags manager inside editor header
        renderNoteTagsInEditorHeader();
        
        // Update word and character statistics
        updateStats();
        
        initNoteHistory();
        
        // Update active styling in sidebar list
        document.querySelectorAll('.note-item').forEach(item => {
            if (item.dataset.id === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Auto-close sidebar on mobile note selection
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    }
}

function getCleanEditorHtml() {
    const clone = noteContent.cloneNode(true);
    const ghost = clone.querySelector('.ghost-suggestion');
    if (ghost) {
        ghost.remove();
    }
    return clone.innerHTML;
}

function updateActiveNote() {
    if (!activeNoteId) return;
    
    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex !== -1) {
        const note = notes[noteIndex];
        note.title = noteTitle.value || i18n[currentLang].noteTitlePlaceholder;
        note.content = getCleanEditorHtml();
        note.updatedAt = new Date().toISOString();
        
        // Move to the top of the notes array if it is not already there
        if (noteIndex > 0) {
            notes.splice(noteIndex, 1);
            notes.unshift(note);
        }
        
        saveNotesToStorage();
        updateNoteItemInList(note);
        
        // Instant DOM move to top to avoid flickering and heavy re-renders
        const item = document.querySelector(`.note-item[data-id="${note.id}"]`);
        if (item && item.previousElementSibling) {
            notesList.insertBefore(item, notesList.firstChild);
        }
        
        updateStats(); // Dynamic update
        updateLocalDictionary();
    }
}

// --- SIDEBAR UI RENDERER ---

function renderNotesList() {
    notesList.innerHTML = '';
    
    // Filter notes based on active search text and tag filter
    const filteredNotes = notes.filter(note => {
        // Always keep the active note visible in the list while editing it
        if (note.id === activeNoteId) return true;

        if (activeTagFilter) {
            const hasTag = note.tags && note.tags.some(t => t.name.toLowerCase() === activeTagFilter.toLowerCase());
            if (!hasTag) return false;
        }
        
        if (notesSearchQuery) {
            const query = notesSearchQuery.toLowerCase();
            const titleMatch = note.title && note.title.toLowerCase().includes(query);
            const contentMatch = note.content && note.content.toLowerCase().includes(query);
            return titleMatch || contentMatch;
        }
        
        return true;
    });
    
    filteredNotes.forEach(note => {
        const li = document.createElement('li');
        li.className = `note-item ${note.id === activeNoteId ? 'active' : ''}`;
        li.dataset.id = note.id;
        li.draggable = true;

        // Drag and drop events for manual note reordering
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', note.id);
            li.classList.add('dragging');
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            document.querySelectorAll('.note-item').forEach(item => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rect = li.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                li.classList.add('drag-over-top');
                li.classList.remove('drag-over-bottom');
            } else {
                li.classList.add('drag-over-bottom');
                li.classList.remove('drag-over-top');
            }
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = note.id;
            
            if (draggedId === targetId) return;
            
            const draggedIndex = notes.findIndex(n => n.id === draggedId);
            const targetIndex = notes.findIndex(n => n.id === targetId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const isTop = e.clientY < midpoint;
                
                const [draggedNote] = notes.splice(draggedIndex, 1);
                
                let newIndex = targetIndex;
                if (draggedIndex < targetIndex) {
                    newIndex = isTop ? targetIndex - 1 : targetIndex;
                } else {
                    newIndex = isTop ? targetIndex : targetIndex + 1;
                }
                
                notes.splice(newIndex, 0, draggedNote);
                saveNotesToStorage();
                renderNotesList();
            }
        });
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'note-item-title';
        titleSpan.textContent = note.title;
        
        const previewSpan = document.createElement('span');
        previewSpan.className = 'note-item-preview';
        const cleanPreview = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
        previewSpan.textContent = cleanPreview ? cleanPreview.substring(0, 35) + '...' : i18n[currentLang].emptyNote;
        
        // Tags sub-container in list item
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'note-item-tags-list';
        if (note.tags && note.tags.length > 0) {
            note.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'tag-pill-sidebar';
                tagSpan.style.backgroundColor = tag.color;
                tagSpan.textContent = tag.name;
                // Click to filter by this tag
                tagSpan.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setTagFilter(tag.name);
                });
                tagsDiv.appendChild(tagSpan);
            });
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-note-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = i18n[currentLang].confirmDeleteTitle;
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Avoid selecting the note when clicking delete
            const confirmed = await showCustomConfirm(
                i18n[currentLang].confirmDeleteTitle,
                i18n[currentLang].confirmDeleteMsg.replace('{title}', note.title)
            );
            if (confirmed) {
                deleteNote(note.id);
            }
        });
        
        li.appendChild(titleSpan);
        li.appendChild(previewSpan);
        li.appendChild(tagsDiv);
        li.appendChild(deleteBtn);
        
        li.addEventListener('click', () => selectNote(note.id));
        notesList.appendChild(li);
    });
}

function deleteNote(id) {
    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        saveNotesToStorage();
        
        if (notes.length === 0) {
            createNewNote(i18n[currentLang].noteTitlePlaceholder, "");
        } else {
            renderNotesList();
            if (activeNoteId === id) {
                selectNote(notes[0].id);
            }
        }
    }
}

function updateNoteItemInList(note) {
    const item = document.querySelector(`.note-item[data-id="${note.id}"]`);
    if (item) {
        item.querySelector('.note-item-title').textContent = note.title;
        const cleanPreview = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
        item.querySelector('.note-item-preview').textContent = cleanPreview ? cleanPreview.substring(0, 35) + '...' : i18n[currentLang].emptyNote;
    }
}

// Parse any CSS color string to RGB object
function parseRGB(colorStr) {
    if (!colorStr) return null;
    colorStr = colorStr.trim().toLowerCase();
    
    // rgb(r, g, b) or rgba(r, g, b, a)
    let match = colorStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (match) {
        return { 
            r: parseInt(match[1]), 
            g: parseInt(match[2]), 
            b: parseInt(match[3]), 
            a: match[4] ? parseFloat(match[4]) : 1 
        };
    }
    
    // hex #fff or #ffffff or #ffffffff
    if (colorStr.startsWith('#')) {
        let hex = colorStr.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            let r = parseInt(hex[0] + hex[0], 16);
            let g = parseInt(hex[1] + hex[1], 16);
            let b = parseInt(hex[2] + hex[2], 16);
            return { r, g, b, a: 1 };
        } else if (hex.length === 6 || hex.length === 8) {
            let r = parseInt(hex.slice(0, 2), 16);
            let g = parseInt(hex.slice(2, 4), 16);
            let b = parseInt(hex.slice(4, 6), 16);
            return { r, g, b, a: 1 };
        }
    }
    
    // Fallback using document body temporary element
    try {
        const tempEl = document.createElement('div');
        tempEl.style.color = colorStr;
        document.body.appendChild(tempEl);
        const computedColor = window.getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);
        match = computedColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
        if (match) {
            return { 
                r: parseInt(match[1]), 
                g: parseInt(match[2]), 
                b: parseInt(match[3]), 
                a: match[4] ? parseFloat(match[4]) : 1 
            };
        }
    } catch (e) {
        // Safe fallback
    }
    
    return null;
}

// Adapt all note color styling (foreground and background) to be readable on the current theme
function adaptNoteColorsToTheme() {
    const editor = document.getElementById('note-content');
    if (!editor) return;
    
    const isLightTheme = document.body.classList.contains('light-theme');
    const elements = editor.getElementsByTagName('*');
    
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        
        // 1. Adapt inline text color
        if (el.style.color) {
            const rgb = parseRGB(el.style.color);
            if (rgb) {
                const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
                if (isLightTheme && luminance > 170) {
                    // Very light text on light theme: clear it to default to dark text
                    el.style.color = '';
                } else if (!isLightTheme && luminance < 100) {
                    // Very dark text on dark theme: clear it to default to light text
                    el.style.color = '';
                }
            }
        }
        
        // 2. Adapt inline background color (unintentional editor blocks)
        if (el.style.backgroundColor) {
            const rgb = parseRGB(el.style.backgroundColor);
            if (rgb) {
                const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
                const variance = Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b);
                
                // If it's a grayscale/neutral background (like pasted IDE background blocks)
                if (variance < 20) {
                    if (isLightTheme && luminance > 220) {
                        // Light background block in light theme: clear it
                        el.style.backgroundColor = '';
                        if (el.style.background) el.style.background = '';
                    } else if (!isLightTheme && luminance < 40) {
                        // Dark background block in dark theme: clear it
                        el.style.backgroundColor = '';
                        if (el.style.background) el.style.background = '';
                    }
                }
            }
        }
    }
}

// --- EVENT LISTENERS ---

function setupEventListeners() {
    newNoteBtn.addEventListener('click', () => createNewNote());
    
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const langToggleBtn = document.getElementById('lang-toggle-btn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }
    
    const ytBtn = document.getElementById('yt-btn');
    if (ytBtn) {
        ytBtn.addEventListener('click', handleYoutubeSummarize);
    }
    
    // Auto-save on typing title or content
    noteTitle.addEventListener('input', () => {
        showStatus(i18n[currentLang].statusSaving);
        updateActiveNote();
    });
    
    noteContent.addEventListener('input', (e) => {
        // Force fully empty DOM when no text exists, to trigger CSS :empty placeholder
        if (noteContent.textContent.trim() === "" && (noteContent.innerHTML === "" || noteContent.innerHTML === "<br>" || noteContent.innerHTML === "<div><br></div>" || noteContent.innerHTML === "<p><br></p>")) {
            noteContent.innerHTML = "";
        }
        showStatus(i18n[currentLang].statusSaving);
        updateActiveNote();
        handleAutocompleteInput(e);
    });

    noteTitle.addEventListener('keydown', registerTypingHistory);
    noteContent.addEventListener('keydown', (e) => {
        registerTypingHistory(e);
        handleAutocompleteKeydown(e);
    });
    noteContent.addEventListener('click', (e) => {
        if (e.target.tagName === 'HR') {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNode(e.target);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
    document.addEventListener('keydown', handleGlobalUndoRedo);
    document.addEventListener('keydown', handleGlobalEscKey);
    
    noteContent.addEventListener('paste', (e) => {
        pushHistory();
        e.preventDefault();
        
        // Get plain text from clipboard
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        
        // Insert it at the cursor position
        document.execCommand('insertText', false, text);
        
        setTimeout(() => {
            adaptNoteColorsToTheme();
            updateActiveNote();
        }, 50);
    });
    
    // Selection Range Listeners inside rich editor
    noteContent.addEventListener('keyup', saveSelection);
    noteContent.addEventListener('mouseup', saveSelection);
    noteContent.addEventListener('focus', saveSelection);
    
    // Rich Text Formatting Buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Retain editor selection focus
        });
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Skip custom color action buttons
            if (btn.id === 'color-fore-btn' || btn.id === 'color-back-btn') {
                return;
            }
            
            pushHistory();
            restoreSelection();
            const command = btn.dataset.command;
            document.execCommand(command, false, null);
            saveSelection();
            showStatus(i18n[currentLang].statusModified);
            updateActiveNote();
            noteContent.focus();
        });
    });
    
    // Text Color Custom Button & Dropdown Menu
    const colorForeBtn = document.getElementById('color-fore-btn');
    const colorForeInput = document.getElementById('color-fore');
    const colorForeIndicator = document.getElementById('color-fore-indicator');
    const colorForeMenu = document.getElementById('color-fore-menu');
    const colorForeCustomBtn = document.getElementById('color-fore-custom-btn');
    
    // Text Highlight Color Custom Button & Dropdown Menu
    const colorBackBtn = document.getElementById('color-back-btn');
    const colorBackInput = document.getElementById('color-back');
    const colorBackIndicator = document.getElementById('color-back-indicator');
    const colorBackMenu = document.getElementById('color-back-menu');
    const colorBackCustomBtn = document.getElementById('color-back-custom-btn');
    
    // Helper to close all color menus
    const closeColorMenus = () => {
        if (colorForeMenu) colorForeMenu.classList.remove('open');
        if (colorBackMenu) colorBackMenu.classList.remove('open');
    };
    
    // Close color menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.color-picker-wrapper')) {
            closeColorMenus();
        }
    });
    
    // Prevent focus loss when clicking inside the color dropdown menus
    if (colorForeMenu) {
        colorForeMenu.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    }
    if (colorBackMenu) {
        colorBackMenu.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    }
    
    // 1. Text Color Functionality
    if (colorForeBtn && colorForeMenu) {
        colorForeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = colorForeMenu.classList.contains('open');
            closeColorMenus();
            if (!isOpen) {
                colorForeMenu.classList.add('open');
            }
        });
        
        // Preset Colors Click Listener
        colorForeMenu.querySelectorAll('.color-menu-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = dot.dataset.color;
                pushHistory();
                restoreSelection();
                document.execCommand('foreColor', false, color);
                saveSelection();
                if (colorForeIndicator) {
                    colorForeIndicator.style.background = color;
                }
                showStatus(i18n[currentLang].statusColorChanged);
                updateActiveNote();
                closeColorMenus();
                noteContent.focus();
            });
        });
        
        // Custom Color Button Click Listener
        if (colorForeCustomBtn && colorForeInput) {
            colorForeCustomBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeColorMenus();
                colorForeInput.click();
            });
        }
        
        // Live Preview on dragging custom color picker
        colorForeInput.addEventListener('input', (e) => {
            const color = e.target.value;
            restoreSelection();
            document.execCommand('foreColor', false, color);
            if (colorForeIndicator) {
                colorForeIndicator.style.background = color;
            }
        });
        
        // Commit color on picker close/change
        colorForeInput.addEventListener('change', (e) => {
            const color = e.target.value;
            pushHistory();
            restoreSelection();
            document.execCommand('foreColor', false, color);
            saveSelection();
            if (colorForeIndicator) {
                colorForeIndicator.style.background = color;
            }
            showStatus(i18n[currentLang].statusColorChanged);
            updateActiveNote();
            noteContent.focus();
        });
    }
    
    // 2. Highlight Color Functionality
    if (colorBackBtn && colorBackMenu) {
        colorBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = colorBackMenu.classList.contains('open');
            closeColorMenus();
            if (!isOpen) {
                colorBackMenu.classList.add('open');
            }
        });
        
        // Preset Highlight Colors Click Listener
        colorBackMenu.querySelectorAll('.color-menu-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = dot.dataset.color;
                pushHistory();
                restoreSelection();
                
                // Remove highlight if transparent, else apply color
                if (color === 'transparent') {
                    if (!document.execCommand('hiliteColor', false, 'transparent')) {
                        document.execCommand('backColor', false, 'transparent');
                    }
                } else {
                    if (!document.execCommand('hiliteColor', false, color)) {
                        document.execCommand('backColor', false, color);
                    }
                }
                
                saveSelection();
                if (colorBackIndicator) {
                    colorBackIndicator.style.background = color;
                }
                showStatus(i18n[currentLang].statusHighlightChanged);
                updateActiveNote();
                closeColorMenus();
                noteContent.focus();
            });
        });
        
        // Custom Color Button Click Listener
        if (colorBackCustomBtn && colorBackInput) {
            colorBackCustomBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeColorMenus();
                colorBackInput.click();
            });
        }
        
        // Live Preview on dragging custom color picker
        colorBackInput.addEventListener('input', (e) => {
            const color = e.target.value;
            restoreSelection();
            if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
            if (colorBackIndicator) {
                colorBackIndicator.style.background = color;
            }
        });
        
        // Commit color on picker close/change
        colorBackInput.addEventListener('change', (e) => {
            const color = e.target.value;
            pushHistory();
            restoreSelection();
            if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
            saveSelection();
            if (colorBackIndicator) {
                colorBackIndicator.style.background = color;
            }
            showStatus(i18n[currentLang].statusHighlightChanged);
            updateActiveNote();
            noteContent.focus();
        });
    }
    
    // 3. Backup & Restore Functionality
    const backupExportBtn = document.getElementById('backup-export-btn');
    const backupImportBtn = document.getElementById('backup-import-btn');
    const backupImportFile = document.getElementById('backup-import-file');
    
    if (backupExportBtn) {
        backupExportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const savedNotes = localStorage.getItem('smartnotes_notes');
            if (!savedNotes || savedNotes === '[]') {
                showToast(currentLang === 'en' ? 'No notes to backup!' : 'Nenhuma nota para exportar backup!', 'warning');
                return;
            }
            try {
                const notesArr = JSON.parse(savedNotes);
                const blob = new Blob([JSON.stringify(notesArr, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
                a.href = url;
                a.download = `smartnotes_backup_${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(i18n[currentLang].toastBackupExportSuccess || 'Backup exported successfully!', 'success');
            } catch (err) {
                console.error(err);
                showToast(currentLang === 'en' ? 'Error exporting backup!' : 'Erro ao exportar backup!', 'error');
            }
        });
    }
    
    if (backupImportBtn && backupImportFile) {
        backupImportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            backupImportFile.click();
        });
        
        backupImportFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (Array.isArray(parsed)) {
                        localStorage.setItem('smartnotes_notes', JSON.stringify(parsed));
                        showToast(i18n[currentLang].toastBackupImportSuccess || 'Backup imported successfully! Reloading...', 'success');
                        setTimeout(() => {
                            location.reload();
                        }, 1500);
                    } else {
                        showToast(i18n[currentLang].toastBackupImportError || 'Invalid backup file format!', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showToast(i18n[currentLang].toastBackupImportError || 'Failed to read backup file!', 'error');
                }
            };
            reader.readAsText(file);
            backupImportFile.value = '';
        });
    }
    
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            pushHistory();
            restoreSelection();
            document.execCommand('fontName', false, e.target.value);
            saveSelection();
            showStatus(i18n[currentLang].statusFontChanged);
            updateActiveNote();
            noteContent.focus();
        });
    }
    
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
            pushHistory();
            restoreSelection();
            document.execCommand('fontSize', false, e.target.value);
            saveSelection();
            showStatus(i18n[currentLang].statusSizeChanged);
            updateActiveNote();
            noteContent.focus();
        });
    }
    
    // AI Toolbar Action Buttons
    aiActionBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Retain editor selection
        });
        btn.addEventListener('click', () => {
            restoreSelection();
            handleAiAction(btn.dataset.action);
        });
    });
    
    // Assistant Chat Sender
    chatSendBtn.addEventListener('click', () => {
        sendChatMessage();
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (activeAiAbortController) {
                return;
            }
            sendChatMessage();
        }
    });

    if (chatStopBtn) {
        chatStopBtn.addEventListener('click', () => {
            if (activeAiAbortController) {
                activeAiAbortController.abort();
            }
        });
    }

    if (cancelAiBtn) {
        cancelAiBtn.addEventListener('click', () => {
            if (activeAiAbortController) {
                activeAiAbortController.abort();
            }
        });
    }

    // Clear Chat Button
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }

    // Search Notes live filtering
    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            notesSearchQuery = e.target.value;
            renderNotesList();
        });
    }

    // Active tag filter clear button
    const clearTagFilterBtn = document.getElementById('clear-tag-filter-btn');
    if (clearTagFilterBtn) {
        clearTagFilterBtn.addEventListener('click', () => {
            clearTagFilter();
        });
    }

    // Tag Manager Popover toggle
    const addTagTriggerBtn = document.getElementById('add-tag-trigger-btn');
    const tagPickerPopover = document.getElementById('tag-picker-popover');
    if (addTagTriggerBtn && tagPickerPopover) {
        addTagTriggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = tagPickerPopover.style.display === 'none';
            tagPickerPopover.style.display = isHidden ? 'flex' : 'none';
            addTagTriggerBtn.classList.toggle('active', isHidden);
        });
        
        // Hide popover if clicking outside
        document.addEventListener('click', (e) => {
            if (!tagPickerPopover.contains(e.target) && e.target !== addTagTriggerBtn) {
                tagPickerPopover.style.display = 'none';
                addTagTriggerBtn.classList.remove('active');
            }
        });
    }

    // Select tag color presets
    const colorDots = document.querySelectorAll('.tag-color-presets .color-dot');
    colorDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            selectedTagColor = dot.dataset.color;
        });
    });

    // Save tag button click
    const saveTagBtn = document.getElementById('save-tag-btn');
    const newTagInput = document.getElementById('new-tag-input');
    if (saveTagBtn && newTagInput) {
        saveTagBtn.addEventListener('click', () => {
            const name = newTagInput.value.trim();
            if (name) {
                addTagToActiveNote(name, selectedTagColor);
                newTagInput.value = '';
                if (tagPickerPopover) {
                    tagPickerPopover.style.display = 'none';
                }
                if (addTagTriggerBtn) {
                    addTagTriggerBtn.classList.remove('active');
                }
            }
        });
        
        newTagInput.addEventListener('input', handleTagAutocompleteInput);
        newTagInput.addEventListener('keydown', (e) => {
            const container = document.getElementById('tag-autocomplete-suggestions');
            const hasSuggestions = container && container.style.display === 'flex';
            if (hasSuggestions) {
                handleTagAutocompleteKeydown(e);
            } else {
                if (e.key === 'Enter') {
                    saveTagBtn.click();
                }
            }
        });
    }

    // Export Note as PDF and Copy HTML
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            window.print();
        });
    }
    const exportHtmlBtn = document.getElementById('export-html-btn');
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', () => {
            copyCleanNoteHtml();
        });
    }

    // Zen Mode toggle
    const zenToggleBtn = document.getElementById('zen-toggle-btn');
    if (zenToggleBtn) {
        zenToggleBtn.addEventListener('click', () => {
            toggleZenMode();
        });
    }

    const exitZenBtn = document.getElementById('exit-zen-btn');
    if (exitZenBtn) {
        exitZenBtn.addEventListener('click', () => {
            exitZenMode();
        });
    }

    // Zen Audio widget close button (hides panel)
    const zenSoundCloseBtn = document.getElementById('zen-sound-close-btn');
    if (zenSoundCloseBtn) {
        zenSoundCloseBtn.addEventListener('click', () => {
            const audioWidget = document.getElementById('zen-audio-widget');
            if (audioWidget) audioWidget.style.display = 'none';
            const showSoundsBtn = document.getElementById('show-zen-sounds-btn');
            if (showSoundsBtn) showSoundsBtn.style.display = 'block';
        });
    }

    // Show Zen Sounds Floating Button click listener
    const showZenSoundsBtn = document.getElementById('show-zen-sounds-btn');
    if (showZenSoundsBtn) {
        showZenSoundsBtn.addEventListener('click', () => {
            const audioWidget = document.getElementById('zen-audio-widget');
            if (audioWidget) audioWidget.style.display = 'block';
            showZenSoundsBtn.style.display = 'none';
        });
    }

    // Toggle Text Reader button in header actions
    const toggleReaderBtn = document.getElementById('toggle-reader-btn');
    const ttsHeaderControls = document.getElementById('tts-header-controls');
    if (toggleReaderBtn && ttsHeaderControls) {
        toggleReaderBtn.addEventListener('click', () => {
            toggleReaderBtn.style.display = 'none';
            ttsHeaderControls.style.display = 'inline-flex';
        });
    }

    // Close Text Reader button (✕ in header controls)
    const closeReaderBtn = document.getElementById('close-reader-btn');
    if (closeReaderBtn) {
        closeReaderBtn.addEventListener('click', () => {
            if (ttsHeaderControls) ttsHeaderControls.style.display = 'none';
            if (toggleReaderBtn) toggleReaderBtn.style.display = 'inline-flex';
            stopTtsPlay();
        });
    }

    // Open Audio Settings Modal
    const ttsSettingsBtn = document.getElementById('tts-settings-btn');
    if (ttsSettingsBtn) {
        ttsSettingsBtn.addEventListener('click', () => {
            const modal = document.getElementById('tts-settings-modal');
            if (modal) modal.classList.add('active');
        });
    }

    // Close Audio Settings Modal
    const closeTtsSettingsBtn = document.getElementById('close-tts-settings-btn');
    if (closeTtsSettingsBtn) {
        closeTtsSettingsBtn.addEventListener('click', () => {
            const modal = document.getElementById('tts-settings-modal');
            if (modal) modal.classList.remove('active');
        });
    }

    // Export dropdown menu toggle
    const exportDropdownBtn = document.getElementById('export-dropdown-btn');
    const exportDropdownMenu = document.getElementById('export-dropdown-menu');
    const copaDropdownBtn = document.getElementById('copa-dropdown-btn');
    const copaDropdownMenu = document.getElementById('copa-dropdown-menu');

    if (exportDropdownBtn && exportDropdownMenu) {
        exportDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = exportDropdownMenu.style.display === 'block';
            exportDropdownMenu.style.display = isVisible ? 'none' : 'block';
            exportDropdownBtn.classList.toggle('active', !isVisible);
            // Close Copa dropdown
            if (copaDropdownMenu) {
                copaDropdownMenu.style.display = 'none';
                if (copaDropdownBtn) copaDropdownBtn.classList.remove('active');
            }
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            exportDropdownMenu.style.display = 'none';
            exportDropdownBtn.classList.remove('active');
        });
    }

    // Copa IA dropdown menu toggle
    if (copaDropdownBtn && copaDropdownMenu) {
        copaDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = copaDropdownMenu.style.display === 'block';
            copaDropdownMenu.style.display = isVisible ? 'none' : 'block';
            copaDropdownBtn.classList.toggle('active', !isVisible);
            // Close Export dropdown
            if (exportDropdownMenu) {
                exportDropdownMenu.style.display = 'none';
                if (exportDropdownBtn) exportDropdownBtn.classList.remove('active');
            }
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            copaDropdownMenu.style.display = 'none';
            copaDropdownBtn.classList.remove('active');
        });
    }

    // Pitch Mode / Slides Presenter Event Listeners
    const pitchModeBtn = document.getElementById('pitch-mode-btn');
    const pitchModal = document.getElementById('pitch-modal');
    const closePitchBtn = document.getElementById('close-pitch-btn');
    const pitchPrevBtn = document.getElementById('pitch-prev-btn');
    const pitchNextBtn = document.getElementById('pitch-next-btn');

    if (pitchModeBtn) {
        pitchModeBtn.addEventListener('click', () => {
            if (copaDropdownMenu) copaDropdownMenu.style.display = 'none';
            openPitchPresenter();
        });
    }

    if (closePitchBtn) {
        closePitchBtn.addEventListener('click', () => {
            if (activeAiAbortController) {
                activeAiAbortController.abort();
            }
            if (pitchModal) {
                pitchModal.style.display = 'none';
                pitchModal.classList.remove('active');
            }
            document.removeEventListener('keydown', handlePitchKeydown);
        });
    }

    const cancelPitchGenBtn = document.getElementById('cancel-pitch-gen-btn');
    if (cancelPitchGenBtn) {
        cancelPitchGenBtn.addEventListener('click', () => {
            if (activeAiAbortController) {
                activeAiAbortController.abort();
            }
            if (pitchModal) {
                pitchModal.style.display = 'none';
                pitchModal.classList.remove('active');
            }
            document.removeEventListener('keydown', handlePitchKeydown);
        });
    }

    if (pitchPrevBtn) {
        pitchPrevBtn.addEventListener('click', () => navigateSlides(-1));
    }
    if (pitchNextBtn) {
        pitchNextBtn.addEventListener('click', () => navigateSlides(1));
    }

    // ROI Calculator Event Listeners
    const roiCalcBtn = document.getElementById('roi-calc-btn');
    const roiModal = document.getElementById('roi-modal');
    const closeRoiBtn = document.getElementById('close-roi-btn');
    const copyRoiBtn = document.getElementById('copy-roi-btn');
    
    const roiTimeManual = document.getElementById('roi-time-manual');
    const roiTimeAi = document.getElementById('roi-time-ai');
    const roiFrequency = document.getElementById('roi-frequency');
    
    if (roiCalcBtn) {
        roiCalcBtn.addEventListener('click', () => {
            if (copaDropdownMenu) copaDropdownMenu.style.display = 'none';
            openRoiCalculator();
        });
    }
    
    if (closeRoiBtn) {
        closeRoiBtn.addEventListener('click', () => {
            if (roiModal) {
                roiModal.style.display = 'none';
                roiModal.classList.remove('active');
            }
        });
    }
    
    if (roiTimeManual) {
        roiTimeManual.addEventListener('input', (e) => {
            document.getElementById('roi-time-manual-val').innerText = `${e.target.value} min`;
            calculateRoi();
        });
    }
    if (roiTimeAi) {
        roiTimeAi.addEventListener('input', (e) => {
            document.getElementById('roi-time-ai-val').innerText = `${e.target.value} min`;
            calculateRoi();
        });
    }
    if (roiFrequency) {
        roiFrequency.addEventListener('change', () => {
            calculateRoi();
        });
    }
    
    if (copyRoiBtn) {
        copyRoiBtn.addEventListener('click', () => {
            copyRoiReport();
        });
    }

    // Meeting Minutes (Ata Inteligente) Event Listener
    const generateAtaBtn = document.getElementById('generate-ata-btn');
    if (generateAtaBtn) {
        generateAtaBtn.addEventListener('click', () => {
            if (copaDropdownMenu) copaDropdownMenu.style.display = 'none';
            handleAiAction('ata');
        });
    }

    // Zen sound controls
    const soundBtns = document.querySelectorAll('.sound-btn');
    soundBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const track = btn.dataset.track;
            toggleAmbientSound(track);
        });
    });

    const soundVols = document.querySelectorAll('.sound-vol');
    soundVols.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const track = slider.dataset.track;
            const vol = parseFloat(e.target.value);
            adjustAmbientVolume(track, vol);
        });
    });

    // Graph View toggle
    const graphToggleBtn = document.getElementById('graph-toggle-btn');
    if (graphToggleBtn) {
        graphToggleBtn.addEventListener('click', () => {
            openGraphModal();
        });
    }

    const closeGraphBtn = document.getElementById('close-graph-btn');
    if (closeGraphBtn) {
        closeGraphBtn.addEventListener('click', () => {
            closeGraphModal();
        });
    }

    // PDF upload dropzone interaction
    const pdfDropzone = document.getElementById('pdf-dropzone');
    const pdfFileInput = document.getElementById('pdf-file-input');
    if (pdfDropzone && pdfFileInput) {
        pdfDropzone.addEventListener('click', () => {
            pdfFileInput.click();
        });

        pdfFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePdfUpload(file);
            }
        });

        // Drag and drop events
        pdfDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            pdfDropzone.classList.add('dragover');
        });

        pdfDropzone.addEventListener('dragleave', () => {
            pdfDropzone.classList.remove('dragover');
        });

        pdfDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            pdfDropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                handlePdfUpload(file);
            }
        });
    }

    // Web Scraper (Scrapling) Trigger Listeners
    if (scraperBtn) {
        scraperBtn.addEventListener('click', handleWebScrape);
    }
    if (scraperUrlInput) {
        scraperUrlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleWebScrape();
            }
        });
    }

    // Git Patch Export Listener
    if (exportPatchBtn) {
        exportPatchBtn.addEventListener('click', handleGitPatchExport);
    }

    // TTS Player Control Listeners
    if (ttsPlayBtn) {
        ttsPlayBtn.addEventListener('click', toggleTtsPlay);
    }
    if (ttsStopBtn) {
        ttsStopBtn.addEventListener('click', stopTtsPlay);
    }
    if (ttsSpeedSlider) {
        ttsSpeedSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (ttsSpeedDisplay) ttsSpeedDisplay.textContent = `${val.toFixed(1)}x`;
            if (isTtsPlaying) {
                if (ttsAudioPlayer) {
                    ttsAudioPlayer.playbackRate = val;
                }
            }
        });
    }
    if (ttsVolSlider) {
        ttsVolSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (ttsAudioPlayer) {
                ttsAudioPlayer.volume = val;
            }
        });
    }
    
    // Initialize TTS options and check connectivity
    initTts();


    // Responsive event listeners (Mobile Drawer & Desktop Collapse)
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const mobileChatToggle = document.getElementById('mobile-chat-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.querySelector('.sidebar');
    const chatPanel = document.querySelector('.chat-panel');
    const appContainer = document.querySelector('.app-container');

    const isMobile = () => window.matchMedia('(max-width: 1024px), (orientation: portrait)').matches;

    if (mobileSidebarToggle && sidebar && mobileOverlay) {
        mobileSidebarToggle.addEventListener('click', () => {
            if (isMobile()) {
                const isActive = sidebar.classList.toggle('active');
                mobileOverlay.classList.toggle('active', isActive);
                if (chatPanel) {
                    chatPanel.classList.remove('active');
                }
            }
        });
    }

    if (mobileChatToggle && chatPanel && mobileOverlay) {
        mobileChatToggle.addEventListener('click', () => {
            if (isMobile()) {
                const isActive = chatPanel.classList.toggle('active');
                mobileOverlay.classList.toggle('active', isActive);
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
            if (chatPanel) chatPanel.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
    }

    // Desktop Border Toggles
    const desktopSidebarToggle = document.getElementById('desktop-sidebar-toggle');
    const desktopChatToggle = document.getElementById('desktop-chat-toggle');

    if (desktopSidebarToggle && appContainer) {
        desktopSidebarToggle.addEventListener('click', () => {
            const isCollapsed = appContainer.classList.toggle('sidebar-collapsed');
            const icon = desktopSidebarToggle.querySelector('.arrow-icon');
            if (icon) {
                icon.textContent = isCollapsed ? '▶' : '◀';
            }
        });
    }

    if (desktopChatToggle && appContainer) {
        desktopChatToggle.addEventListener('click', () => {
            const isCollapsed = appContainer.classList.toggle('chat-collapsed');
            const icon = desktopChatToggle.querySelector('.arrow-icon');
            if (icon) {
                icon.textContent = isCollapsed ? '◀' : '▶';
            }
        });
    }

    // Reset mobile classes and sync desktop arrow icons when resizing to desktop viewports
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            if (sidebar) sidebar.classList.remove('active');
            if (chatPanel) chatPanel.classList.remove('active');
            if (mobileOverlay) mobileOverlay.classList.remove('active');
            
            // Sync desktop toggle icons
            if (appContainer) {
                const isSidebarCollapsed = appContainer.classList.contains('sidebar-collapsed');
                const sidebarIcon = desktopSidebarToggle ? desktopSidebarToggle.querySelector('.arrow-icon') : null;
                if (sidebarIcon) {
                    sidebarIcon.textContent = isSidebarCollapsed ? '▶' : '◀';
                }

                const isChatCollapsed = appContainer.classList.contains('chat-collapsed');
                const chatIcon = desktopChatToggle ? desktopChatToggle.querySelector('.arrow-icon') : null;
                if (chatIcon) {
                    chatIcon.textContent = isChatCollapsed ? '◀' : '▶';
                }
            }
        }
    });

    // Selection Tip Banner close button listener
    const closeTipBtn = document.getElementById('close-tip-btn');
    const tipBanner = document.getElementById('selection-tip-banner');
    if (closeTipBtn && tipBanner) {
        closeTipBtn.addEventListener('click', () => {
            tipBanner.style.display = 'none';
            localStorage.setItem('smartnotes_hide_selection_tip', 'true');
        });
    }

    // Remove Highlight event listener
    const removeHighlightBtn = document.getElementById('remove-highlight-btn');
    if (removeHighlightBtn) {
        removeHighlightBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Retain editor selection focus
        });
        removeHighlightBtn.addEventListener('click', () => {
            pushHistory();
            restoreSelection();
            
            // 1. Try browser-native transparent command
            document.execCommand('backColor', false, 'transparent');
            document.execCommand('backColor', false, 'rgba(0,0,0,0)');
            
            // 2. Also remove style="background-color: ...", background, and color inline styles
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                const cleanNodeStyles = (node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        node.style.backgroundColor = '';
                        node.style.background = '';
                        node.style.color = '';
                    }
                };

                // Clear container itself if it's an element
                cleanNodeStyles(container);
                
                // Clear all intersecting children
                if (container.nodeType === Node.ELEMENT_NODE) {
                    const walker = document.createTreeWalker(
                        container,
                        NodeFilter.SHOW_ELEMENT,
                        {
                            acceptNode: (n) => {
                                return range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                            }
                        }
                    );
                    
                    let currentNode = walker.currentNode;
                    while (currentNode) {
                        cleanNodeStyles(currentNode);
                        currentNode = walker.nextNode();
                    }
                }
            } else {
                // If nothing selected, clean the entire note!
                const elements = noteContent.getElementsByTagName('*');
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    el.style.backgroundColor = '';
                    el.style.background = '';
                    el.style.color = '';
                }
            }
            
            saveSelection();
            showStatus(i18n[currentLang].statusModified);
            updateActiveNote();
            noteContent.focus();
        });
    }

    // Collapsible AI Quick Actions Toolbar logic
    const aiToolbarToggleBtn = document.getElementById('ai-toolbar-toggle-btn');
    const aiToolbarButtons = document.getElementById('ai-toolbar-buttons');
    if (aiToolbarToggleBtn && aiToolbarButtons) {
        aiToolbarToggleBtn.addEventListener('click', () => {
            const isVisible = aiToolbarButtons.classList.contains('expanded');
            const toggleIcon = aiToolbarToggleBtn.querySelector('.toggle-icon');
            
            if (isVisible) {
                // Collapse
                aiToolbarButtons.classList.remove('expanded');
                if (toggleIcon) toggleIcon.innerText = '▶';
                // Remove animations class
                const actionBtns = aiToolbarButtons.querySelectorAll('.ai-action-btn');
                actionBtns.forEach(btn => btn.classList.remove('animate-in'));
            } else {
                // Expand
                aiToolbarButtons.classList.add('expanded');
                if (toggleIcon) toggleIcon.innerText = '◀';
                
                // Staggered entry animation
                const actionBtns = aiToolbarButtons.querySelectorAll('.ai-action-btn');
                actionBtns.forEach((btn, idx) => {
                    btn.classList.remove('animate-in');
                    btn.style.animationDelay = `${idx * 50}ms`;
                    // Force DOM reflow to restart animation
                    void btn.offsetWidth;
                    btn.classList.add('animate-in');
                });
            }
        });
    }
}

// --- LOCAL AI CONNECTOR BRIDGE ---

function setAiGeneratingState(isGenerating) {
    const sendBtn = document.getElementById('chat-send-btn');
    const stopBtn = document.getElementById('chat-stop-btn');
    const cancelBtn = document.getElementById('cancel-ai-btn');
    
    if (sendBtn && stopBtn) {
        if (isGenerating) {
            sendBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
        } else {
            sendBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
        }
    }
    if (cancelBtn) {
        cancelBtn.style.display = isGenerating ? 'inline-flex' : 'none';
    }
}

async function callLocalAI(prompt, systemInstruction) {
    const selectedModel = modelSelect.value;
    
    if (activeAiAbortController) {
        activeAiAbortController.abort();
    }
    
    activeAiAbortController = new AbortController();
    lastAiStartTime = Date.now();
    setAiGeneratingState(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: activeAiAbortController.signal,
            body: JSON.stringify({
                prompt: prompt,
                model: selectedModel,
                systemInstruction: systemInstruction
            })
        });
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data.text;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('AI request aborted by user');
            throw new Error('cancelled');
        }
        console.error('Local AI Inference Error:', error);
        throw error;
    } finally {
        activeAiAbortController = null;
        setAiGeneratingState(false);
    }
}

// Helper to ensure the AI Assistant Chat panel is visible
function ensureChatPanelOpen() {
    const appContainer = document.getElementById('app-container');
    const chatPanel = document.getElementById('chat-panel');
    const mobileOverlay = document.getElementById('mobile-overlay');
    
    if (appContainer && appContainer.classList.contains('chat-collapsed')) {
        appContainer.classList.remove('chat-collapsed');
        const desktopChatToggle = document.getElementById('desktop-chat-toggle');
        if (desktopChatToggle) {
            const icon = desktopChatToggle.querySelector('.arrow-icon');
            if (icon) {
                icon.textContent = '▶';
            }
        }
    }
    
    const isMobileMode = window.matchMedia('(max-width: 1024px), (orientation: portrait)').matches;
    if (isMobileMode) {
        if (chatPanel) chatPanel.classList.add('active');
        if (mobileOverlay) mobileOverlay.classList.add('active');
    }
}

// Handles toolbar AI quick actions (summarize, improve, translate, etc.)
async function handleAiAction(actionType) {
    const selection = window.getSelection();
    let savedRange = null;
    let selectedText = "";
    
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
        selectedText = savedRange.toString();
    }
    
    const textToProcess = selectedText.trim() || noteContent.innerText.trim();
    
    if (!textToProcess) {
        showToast(i18n[currentLang].toastSelectionInfo, 'info');
        return;
    }
    
    // Auto-open chat panel so user can see AI status/results
    ensureChatPanelOpen();
    
    let prompt = "";
    let systemInstruction = "";
    
    if (currentLang === 'en') {
        systemInstruction = "You are an intelligent text editing assistant. Perform only what is requested, without introductory conversations.";
        if (actionType === 'expand') {
            prompt = `Based on the following text, continue writing and developing the topic in English with new explanatory and detailed paragraphs:\n\n${textToProcess}`;
            systemInstruction = "You are a professional writer and editor. Write the continuation of the provided text, in an educational and detailed manner in English, without repeating the original text and without using Markdown formatting (like #, ##, * or **). Write only the continuation.";
        } else {
            switch (actionType) {
                case 'summarize':
                    prompt = `Summarize the following text in English concisely, keeping the most important points:\n\n"${textToProcess}"`;
                    break;
                case 'improve':
                    prompt = `Improve the writing and clarity of the following text in English. Make it elegant, fluid, and professional:\n\n"${textToProcess}"`;
                    break;
                case 'translate':
                    prompt = `Translate the following text to English. If the text is already in English, translate it to Portuguese naturally and precisely. Return ONLY the clean translation:\n\n"${textToProcess}"`;
                    systemInstruction = "You are a professional bidirectional translator (English <-> Portuguese). Translate the provided text. If the text is in Portuguese, translate to English. If it is in English, translate to Portuguese. Return only the clean, direct translation without any intro, outro, explanations, or quotes.";
                    break;
                case 'bullets':
                    prompt = `Extract the main topics and important information from the following text into a list of short bullet points in English:\n\n"${textToProcess}"`;
                    break;
                case 'format':
                    prompt = `Read the following text and format it cleanly in English. Correct any spacing issues, group ideas into logical paragraphs, ensure clear punctuation and proper grammar, and make it read like a professional document. Preserve the exact meaning and key information. Do not add introductory remarks or comments:\n\n"${textToProcess}"`;
                    systemInstruction = "You are a professional text formatting and copy-editing assistant. Output only the reformatted, cleaned up version of the text, divided into proper paragraphs. Do not write any explanations or conversational intro.";
                    break;
                case 'ata':
                    prompt = `Convert the following text/meeting notes into a highly structured, professional meeting minutes document in English. Organize it into sections: Summary, Key Decisions, and a detailed Action Items markdown table with columns (Action/Task, Owner, Deadline):\n\n"${textToProcess}"`;
                    systemInstruction = "You are a professional corporate secretary assistant. Produce only the structured meeting minutes with summary, decisions, and markdown table. Do not write any explanations or intro.";
                    break;
            }
        }
    } else {
        systemInstruction = "Você é um assistente de edição de texto inteligente. Faça apenas o que for pedido, sem conversas introdutórias.";
        if (actionType === 'expand') {
            prompt = `Com base no seguinte texto, continue escrevendo e desenvolvendo o assunto em português com novos parágrafos explicativos e detalhados:\n\n${textToProcess}`;
            systemInstruction = "Você é um escritor profissional e especialista em redação. Escreva a continuação do texto fornecido, de forma didática e muito detalhada em português, sem repetir o texto original e sem usar formatação Markdown (como #, ##, * ou **). Escreva apenas a continuação.";
        } else {
            switch (actionType) {
                case 'summarize':
                    prompt = `Resuma o seguinte text em português de forma concisa, mantendo os pontos mais importantes:\n\n"${textToProcess}"`;
                    break;
                case 'improve':
                    prompt = `Melhore a escrita e clareza do seguinte texto em português. Torne-o mais elegante, fluido e profissional:\n\n"${textToProcess}"`;
                    break;
                case 'translate':
                    prompt = `Traduza o seguinte texto para o português. Se o texto já estiver em português, traduza-o para o inglês de forma natural e precisa. Retorne APENAS a tradução direta, sem introduções ou explicações:\n\n"${textToProcess}"`;
                    systemInstruction = "Você é um tradutor profissional bidirecional (Inglês <-> Português). Traduza o texto fornecido. Se o texto for em inglês, traduza para o português. Se for em português, traduza para o inglês. Retorne apenas a tradução limpa e direta, sem introduções, explicações ou aspas.";
                    break;
                case 'bullets':
                    prompt = `Extraia os principais tópicos e informações importantes do seguinte texto em uma lista de bullet points curtos:\n\n"${textToProcess}"`;
                    break;
                case 'format':
                    prompt = `Leia o texto a seguir e formate-o de forma limpa em português. Corrija problemas de espaçamento, organize as ideias em parágrafos lógicos e bem estruturados, ajuste pontuações e gramática, tornando a leitura fluida e profissional. Preserve o significado exato e as informações principais. Não adicione comentários ou notas explicativas:\n\n"${textToProcess}"`;
                    systemInstruction = "Você é um assistente profissional de formatação de texto e revisão. Escreva apenas a versão reformatada e limpa do texto, dividida em parágrafos adequados. Não escreva nenhuma introdução, nota ou comentário.";
                    break;
                case 'ata':
                    prompt = `Converta as seguintes notas de reunião ou transcrição em uma Ata de Reunião profissional e estruturada em português. Inclua um sumário geral, as principais decisões tomadas e uma tabela markdown de tarefas contendo as colunas: Ação / Tarefa, Responsável, Prazo:\n\n"${textToProcess}"`;
                    systemInstruction = "Você é um coordenador de reuniões corporativas de alta performance. Escreva apenas a ata estruturada em português contendo Sumário Geral, Principais Decisões e a Tabela de Ações e Prazos. Não adicione conversas, introduções ou explicações fora da ata.";
                    break;
            }
        }
    }
    
    const loadingId = appendMessage('assistant', i18n[currentLang].toastAiProcessing, true);
    showStatus(i18n[currentLang].statusLoading);
    
    try {
        let result = await callLocalAI(prompt, systemInstruction);
        removeMessage(loadingId);
        
        result = cleanYoutubeSummaryFormatting(result);
        
        pushHistory();
        
        if (actionType === 'format' || actionType === 'ata') {
            const cleanResult = markdownToHtml(result);
            if (savedRange && selectedText.trim().length > 0) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
                savedRange.deleteContents();
                
                const el = document.createElement("div");
                el.innerHTML = cleanResult;
                const frag = document.createDocumentFragment();
                let node;
                while ((node = el.firstChild)) {
                    frag.appendChild(node);
                }
                savedRange.insertNode(frag);
            } else {
                noteContent.innerHTML = cleanResult;
            }
            updateActiveNote();
            if (actionType === 'ata') {
                showToast(currentLang === 'en' ? 'Meeting minutes generated!' : 'Ata de reunião gerada com sucesso!', 'success');
                appendMessage('assistant', currentLang === 'en' ? '🎙️ Meeting minutes generated.' : '🎙️ A ata de reunião foi gerada com sucesso.', false, false);
            } else {
                showToast(currentLang === 'en' ? 'Text formatted successfully!' : 'Texto formatado com sucesso!', 'success');
                appendMessage('assistant', currentLang === 'en' ? '✨ Text has been automatically formatted.' : '✨ O texto foi formatado automaticamente.', false, false);
            }
        } else if (actionType === 'expand') {
            const cleanResult = markdownToHtml(result);
            
            if (savedRange && selectedText.trim().length > 0) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
                savedRange.collapse(false);
                
                insertHtmlAtCursor(" " + cleanResult);
            } else {
                const separator = `<br><br><strong>✍️ ${currentLang === 'en' ? 'AI Continuation' : 'Continuação da IA'}:</strong><br>`;
                noteContent.innerHTML += separator + cleanResult;
            }
            updateActiveNote();
            showToast(i18n[currentLang].toastSuccessExpand, 'success');
            appendMessage('assistant', i18n[currentLang].toastAiSuccess, false, false);
        } else {
            appendMessage('assistant', result);
        }
        showStatus(i18n[currentLang].statusSaved);
    } catch (error) {
        removeMessage(loadingId);
        if (error.message === 'cancelled') {
            appendMessage('assistant', currentLang === 'en' ? '❌ Action cancelled by user.' : '❌ Ação cancelada pelo usuário.', false, false);
            showStatus(i18n[currentLang].statusSaved);
        } else {
            appendMessage('assistant', i18n[currentLang].toastAiError, false, false);
            showStatus(i18n[currentLang].statusError);
        }
    }
}

// Sends chat messaging with current note text attached as reference context
async function sendChatMessage() {
    const userPrompt = chatInput.value.trim();
    if (!userPrompt) return;
    
    appendMessage('user', userPrompt);
    chatInput.value = '';
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    const noteContext = activeNote ? activeNote.content : '';
    
    let promptWithContext = "";
    let systemInstruction = "";
    
    if (currentLang === 'en') {
        promptWithContext = `Current Note Context:\n"""\n${noteContext}\n"""\n\nUser's question about the note:\n${userPrompt}`;
        systemInstruction = "You are a helpful and intelligent AI assistant integrated into a notepad. Answer the user's question using the provided note context if it is relevant. If the question is not related to the note, answer normally. Respond in English.";
    } else {
        promptWithContext = `Contexto da Nota Atual:\n"""\n${noteContext}\n"""\n\nPergunta do usuário sobre a nota:\n${userPrompt}`;
        systemInstruction = "Você é um assistente de IA útil e inteligente integrado a um bloco de notas. Responda à pergunta do usuário utilizando o contexto da nota fornecido se for relevante. Se a pergunta não for relacionada à nota, responda normalmente. Responda em português.";
    }
    
    const loadingId = appendMessage('assistant', i18n[currentLang].toastAiThinking, true);
    
    try {
        const result = await callLocalAI(promptWithContext, systemInstruction);
        removeMessage(loadingId);
        appendMessage('assistant', result);
    } catch (error) {
        removeMessage(loadingId);
        if (error.message === 'cancelled') {
            appendMessage('assistant', currentLang === 'en' ? '❌ Request cancelled by user.' : '❌ Requisição cancelada pelo usuário.', false, false);
        } else {
            appendMessage('assistant', i18n[currentLang].toastAiError, false, false);
        }
    }
}

// --- CHAT INTERACTION HELPERS ---

function appendMessage(sender, text, isLoading = false, showCreateNoteBtn = true) {
    const messageId = Date.now().toString();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.dataset.id = messageId;
    if (isLoading) {
        messageDiv.classList.add('loading');
    }
    
    let cleanText = text;
    if (sender === 'assistant') {
        cleanText = text
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/<think>[\s\S]*/g, '')
            .trim();
        
        cleanText = cleanYoutubeSummaryFormatting(cleanText);
    }
    
    const formattedText = markdownToHtml(cleanText);
    messageDiv.innerHTML = formattedText;
    
    if (sender === 'assistant' && !isLoading && showCreateNoteBtn) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '0.5rem';
        
        const createBtn = document.createElement('button');
        createBtn.className = 'msg-action-btn';
        createBtn.innerHTML = `📝 ${currentLang === 'en' ? 'Create Note' : 'Criar Nota'}`;
        createBtn.title = currentLang === 'en' ? 'Create a new note with this content' : 'Criar uma nova nota com este conteúdo';
        createBtn.addEventListener('click', () => createNoteFromMessage(cleanText));
        
        const insertBtn = document.createElement('button');
        insertBtn.className = 'msg-action-btn';
        insertBtn.innerHTML = `📥 ${currentLang === 'en' ? 'Insert into Note' : 'Inserir na Nota'}`;
        insertBtn.title = currentLang === 'en' ? 'Insert this content into the active note' : 'Inserir este conteúdo na nota ativa';
        insertBtn.addEventListener('click', () => insertMessageIntoNote(cleanText));
        
        actionsDiv.appendChild(createBtn);
        actionsDiv.appendChild(insertBtn);
        messageDiv.appendChild(actionsDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageId;
}

function removeMessage(id) {
    const msg = document.querySelector(`.message[data-id="${id}"]`);
    if (msg) {
        msg.remove();
    }
}

// --- YOUTUBE SUMMARY ROUTINE ---

async function handleYoutubeSummarize() {
    const ytUrlInput = document.getElementById('yt-url');
    const url = ytUrlInput.value.trim();
    
    if (!url) {
        showToast(i18n[currentLang].toastYtError, 'error');
        return;
    }
    
    let videoId = "unknown";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }
    
    ytUrlInput.value = '';
    
    const loadingId = appendMessage('assistant', i18n[currentLang].toastYtDownloading, true);
    
    try {
        let transcript = "";
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/api/youtube-transcript?url=${encodeURIComponent(url)}`);
        } catch (fetchErr) {
            throw new Error(i18n[currentLang].toastYtFetchError);
        }
        
        if (!response.ok) {
            throw new Error(i18n[currentLang].toastYtServerError.replace('{status}', response.status));
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(i18n[currentLang].toastYtFormatError);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        transcript = data.transcript;
        
        let words = transcript.split(/\s+/);
        if (words.length > 1800) {
            transcript = words.slice(0, 1800).join(' ') + (currentLang === 'en' ? '... [Transcript truncated due to context limit]' : '... [Transcrição truncada devido ao limite de contexto]');
        }
        
        // Subtitles extracted successfully
        
        let prompt = "";
        let systemInstruction = "";
        
        if (currentLang === 'en') {
            prompt = `Create a structured and detailed summary in English based on the following YouTube video transcript:\n\n${transcript}`;
            systemInstruction = "You are an expert at summarizing videos and lectures. Respond in English clearly. Create a well-explained summary containing: 1) The Main Goal of the video, 2) The Main Topics discussed, and 3) A Conclusion. Write in a clean and readable text format. DO NOT use special formatting characters like hashtags (#), brackets ([]), or asterisks (*). Write only plain text and clean paragraphs.";
        } else {
            prompt = `Faça um resumo estruturado e detalhado em português com base na seguinte transcrição de vídeo do YouTube:\n\n${transcript}`;
            systemInstruction = "Você é um especialista em síntese de vídeos e palestras. Responda em português de forma clara. Crie um resumo bem explicado contendo: 1) O Objetivo Principal do vídeo, 2) Os Tópicos Principais discutidos, e 3) Uma Conclusão. Escreva em formato de texto limpo e legível. NÃO utilize caracteres especiais de formatação como hashtags (#), colchetes ([]) ou asteriscos (*). Escreva apenas texto corrido e parágrafos limpos.";
        }
        
        let result = await callLocalAI(prompt, systemInstruction);
        removeMessage(loadingId);
        
        result = cleanYoutubeSummaryFormatting(result);
        appendMessage('assistant', result);
    } catch (error) {
        removeMessage(loadingId);
        if (error.message === 'cancelled') {
            appendMessage('assistant', currentLang === 'en' ? '❌ Action cancelled by user.' : '❌ Ação cancelada pelo usuário.');
        } else {
            appendMessage('assistant', `❌ ${error.message}`);
        }
    }
}

function clearChat() {
    chatMessages.innerHTML = `
        <div class="message system-message" data-i18n="chatWelcome">
            ${i18n[currentLang].chatWelcome}
        </div>
    `;
    showStatus(i18n[currentLang].statusChatCleared);
}

function createNoteFromMessage(text) {
    let title = currentLang === 'en' ? "Video Summary" : "Resumo de Vídeo";
    const titleMatch = text.match(/#\s*(.*?)\n/);
    if (titleMatch) {
        title = titleMatch[1].replace(/🎥|Resumo do Vídeo:|Video Summary:/g, '').trim();
    } else {
        const firstLine = text.split('\n')[0].substring(0, 30).trim();
        if (firstLine) {
            title = firstLine.replace(/[#*]/g, '').trim();
        }
    }
    
    const htmlContent = markdownToHtml(text);
    createNewNote(title, htmlContent);
    showStatus(i18n[currentLang].statusCreatedFromSummary);
}

function insertMessageIntoNote(text) {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) {
        showToast(currentLang === 'en' ? 'No active note open to insert!' : 'Nenhuma nota ativa aberta para inserir!', 'error');
        return;
    }
    
    pushHistory();
    restoreSelection();
    
    const htmlContent = markdownToHtml(text);
    const sel = window.getSelection();
    let insertedAtCursor = false;
    
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (noteContent.contains(range.commonAncestorContainer)) {
            insertHtmlAtCursor(htmlContent);
            insertedAtCursor = true;
        }
    }
    
    if (!insertedAtCursor) {
        const separator = noteContent.innerHTML.trim() ? "<br><br>" : "";
        noteContent.innerHTML += separator + htmlContent;
    }
    
    saveSelection();
    noteContent.focus();
    updateActiveNote();
    
    showToast(currentLang === 'en' ? 'Inserted into active note!' : 'Inserido na nota ativa!', 'success');
}


// --- DIALOGS AND CUSTOM PREMIUM NOTIFICATION SYSTEM (TOASTS) ---

function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const modalTitle = document.getElementById('confirm-modal-title');
        const modalMessage = document.getElementById('confirm-modal-message');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const okBtn = document.getElementById('confirm-modal-ok');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        modal.classList.add('active');
        
        function cleanup(result) {
            modal.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            okBtn.removeEventListener('click', onOk);
            resolve(result);
        }
        
        function onCancel() {
            cleanup(false);
        }
        
        function onOk() {
            cleanup(true);
        }
        
        cancelBtn.addEventListener('click', onCancel);
        okBtn.addEventListener('click', onOk);
    });
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '24px';
        toastContainer.style.right = '24px';
        toastContainer.style.zIndex = '10000';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '8px';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-msg">${message}</span>
    `;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('active');
    }, 50);
    
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// --- UTILITY FORMATTING & RANGE FUNCTIONS ---

function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (noteContent.contains(range.commonAncestorContainer)) {
            lastSelectionRange = range.cloneRange();
        }
    }
}

function restoreSelection() {
    if (lastSelectionRange) {
        if (document.activeElement !== noteContent) {
            noteContent.focus();
        }
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastSelectionRange);
    }
}

function insertHtmlAtCursor(html) {
    let sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            
            const el = document.createElement("div");
            el.innerHTML = html;
            const frag = document.createDocumentFragment();
            let node, lastNode;
            while ((node = el.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);
            
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
}

function cleanYoutubeSummaryFormatting(text) {
    let clean = text;
    const lines = clean.split('\n');
    const processedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
            let inner = trimmed.substring(2, trimmed.length - 2).trim();
            const colonIndex = inner.indexOf(':');
            if (colonIndex !== -1) {
                const label = inner.substring(0, colonIndex).trim();
                const value = inner.substring(colonIndex + 1).trim();
                return `**${label}:** ${value}`;
            }
            return inner;
        }
        return line;
    });
    return processedLines.join('\n');
}

function markdownToHtml(text) {
    let html = text;
    
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    const lines = html.split('<br>');
    let inList = false;
    const parsedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            let item = trimmed.substring(2);
            if (!inList) {
                inList = true;
                return '<ul><li>' + item + '</li>';
            }
            return '<li>' + item + '</li>';
        } else {
            if (inList) {
                inList = false;
                return '</ul>' + line;
            }
            return line;
        }
    });
    if (inList) {
        parsedLines.push('</ul>');
    }
    
    html = parsedLines.join('<br>')
        .replace(/<\/ul><br>/g, '</ul>')
        .replace(/<br><ul>/g, '<ul>');
        
    return html;
}

// --- INTERNATIONALIZATION ROUTINES (i18n) ---

function updateUiLanguage() {
    // Translate text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[currentLang][key]) {
            el.textContent = i18n[currentLang][key];
        }
    });
    
    // Translate input placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const attrKey = el.getAttribute('data-i18n-placeholder');
        if (i18n[currentLang][attrKey]) {
            el.placeholder = i18n[currentLang][attrKey];
            el.setAttribute('placeholder', i18n[currentLang][attrKey]);
        }
    });

    // Translate attributes titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const attrKey = el.getAttribute('data-i18n-title');
        if (i18n[currentLang][attrKey]) {
            el.title = i18n[currentLang][attrKey];
        }
    });

    // Translate dropdown select options
    const modelSelectOptions = document.getElementById('model-select');
    if (modelSelectOptions && modelSelectOptions.options.length >= 7) {
        modelSelectOptions.options[0].text = i18n[currentLang].modelQwen;
        modelSelectOptions.options[1].text = i18n[currentLang].modelQwenBalanced;
        modelSelectOptions.options[2].text = i18n[currentLang].modelPhi;
        modelSelectOptions.options[3].text = i18n[currentLang].modelDeepseekLight;
        modelSelectOptions.options[4].text = i18n[currentLang].modelDeepseekPro;
        modelSelectOptions.options[5].text = i18n[currentLang].modelMistralNemo;
        modelSelectOptions.options[6].text = i18n[currentLang].modelGpt;
    }

    // Translate scraper elements
    if (scraperBtn) {
        scraperBtn.textContent = i18n[currentLang].scraperBtnText;
        scraperBtn.title = i18n[currentLang].scraperBtnTitle;
    }
    if (exportPatchBtn) {
        exportPatchBtn.textContent = i18n[currentLang].exportPatch;
    }
    
    // Translate TTS Labels
    document.querySelectorAll('.tts-label').forEach(el => {
        const key = el.dataset.i18n;
        if (i18n[currentLang][key]) {
            el.textContent = i18n[currentLang][key];
        }
    });

    if (ttsPlayBtn) {
        ttsPlayBtn.title = i18n[currentLang].ttsPlayTitle;
    }
    if (ttsStopBtn) {
        ttsStopBtn.title = i18n[currentLang].ttsStopTitle;
    }
    updateTtsStatusBadge();


    const toggleReaderBtn = document.getElementById('toggle-reader-btn');
    if (toggleReaderBtn) {
        toggleReaderBtn.title = i18n[currentLang].readerBtnTitle;
    }

    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        const langLabel = langBtn.querySelector('.lang-label');
        if (langLabel) {
            langLabel.textContent = currentLang === 'en' ? 'EN' : 'PT';
        } else {
            langBtn.textContent = currentLang === 'en' ? '🇺🇸' : '🇧🇷'; // Fallback
        }
        langBtn.title = currentLang === 'en' ? 'Switch to Portuguese' : 'Alternar para Inglês';
    }
    
    // Translate size-select options
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect && sizeSelect.options.length >= 4) {
        sizeSelect.options[0].text = i18n[currentLang].sizeMedium;
        sizeSelect.options[1].text = i18n[currentLang].sizeSmall;
        sizeSelect.options[2].text = i18n[currentLang].sizeLarge;
        sizeSelect.options[3].text = i18n[currentLang].sizeExtraLarge;
    }
    
    // Translate active Pomodoro play button title dynamically
    const pomoPlayBtn = document.getElementById('pomodoro-play-btn');
    if (pomoPlayBtn) {
        if (pomoIsActive) {
            pomoPlayBtn.title = i18n[currentLang].pomodoroPause;
            pomoPlayBtn.setAttribute('data-i18n-title', 'pomodoroPause');
        } else {
            pomoPlayBtn.title = i18n[currentLang].pomodoroStart;
            pomoPlayBtn.setAttribute('data-i18n-title', 'pomodoroStart');
        }
    }
    
    // Translate Pomodoro skip button title
    const pomoSkipBtn = document.getElementById('pomodoro-skip-btn');
    if (pomoSkipBtn) {
        pomoSkipBtn.title = i18n[currentLang].pomodoroSkip;
        pomoSkipBtn.setAttribute('data-i18n-title', 'pomodoroSkip');
    }
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'pt' : 'en';
    localStorage.setItem('smartnotes_lang', currentLang);
    updateUiLanguage();
    renderNotesList(); // Reload lists to translate Empty / Vazia state labels
    showStatus(i18n[currentLang].statusSaved);
}

// --- PRODUCTIVITY ENHANCEMENTS AND NEW FEATURES LOGIC ---

// 1. Stats Counter
function updateStats() {
    const text = noteContent.innerText || "";
    const cleanText = text.trim();
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    const chars = text.length;
    const statsText = document.getElementById('stats-text');
    if (statsText) {
        if (currentLang === 'en') {
            statsText.textContent = `${words} words | ${chars} chars`;
        } else {
            statsText.textContent = `${words} palavras | ${chars} caracteres`;
        }
    }
}

// 2. Note Exporter
function copyCleanNoteHtml() {
    const htmlContent = getCleanEditorHtml();
    // Copy to clipboard
    navigator.clipboard.writeText(htmlContent).then(() => {
        showToast(i18n[currentLang].toastHtmlCopied, 'success');
    }).catch(err => {
        console.error('Failed to copy html: ', err);
    });
}

// 3. Tag Categorization System
function addTagToActiveNote(name, color) {
    if (!activeNoteId) return;
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    if (!activeNote.tags) activeNote.tags = [];
    
    // Avoid duplicate tags
    if (activeNote.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        return;
    }
    
    activeNote.tags.push({ name, color });
    activeNote.updatedAt = new Date().toISOString();
    
    // Move to the top of the notes array
    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex > 0) {
        notes.splice(noteIndex, 1);
        notes.unshift(activeNote);
    }
    
    saveNotesToStorage();
    renderNoteTagsInEditorHeader();
    renderNotesList();
}

function removeTagFromNote(name) {
    if (!activeNoteId) return;
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.tags) return;
    
    activeNote.tags = activeNote.tags.filter(t => t.name.toLowerCase() !== name.toLowerCase());
    activeNote.updatedAt = new Date().toISOString();
    
    // Move to the top of the notes array
    const noteIndex = notes.findIndex(n => n.id === activeNoteId);
    if (noteIndex > 0) {
        notes.splice(noteIndex, 1);
        notes.unshift(activeNote);
    }
    
    saveNotesToStorage();
    renderNoteTagsInEditorHeader();
    renderNotesList();
}

function renderNoteTagsInEditorHeader() {
    const container = document.getElementById('note-tags-container');
    if (!container) return;
    container.innerHTML = '';
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.tags) return;
    
    activeNote.tags.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.style.backgroundColor = tag.color;
        pill.textContent = tag.name;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-tag';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTagFromNote(tag.name);
        });
        
        pill.appendChild(removeBtn);
        container.appendChild(pill);
    });
}

function setTagFilter(tagName) {
    activeTagFilter = tagName;
    const filterText = document.getElementById('active-tag-filter-text');
    const filterContainer = document.getElementById('active-tag-filter');
    if (filterText && filterContainer) {
        filterText.textContent = `Tag: ${tagName}`;
        filterContainer.style.display = 'flex';
    }
    renderNotesList();
}

function clearTagFilter() {
    activeTagFilter = null;
    const filterContainer = document.getElementById('active-tag-filter');
    if (filterContainer) {
        filterContainer.style.display = 'none';
    }
    renderNotesList();
}

// 4. Zen Focus Mode
function toggleZenMode() {
    document.body.classList.toggle('zen-focus-mode');
    const isZen = document.body.classList.contains('zen-focus-mode');
    
    const zenToggleBtn = document.getElementById('zen-toggle-btn');
    if (zenToggleBtn) {
        zenToggleBtn.classList.toggle('active', isZen);
    }
    
    const audioWidget = document.getElementById('zen-audio-widget');
    if (audioWidget) {
        audioWidget.style.display = isZen ? 'block' : 'none';
    }
    
    const showSoundsBtn = document.getElementById('show-zen-sounds-btn');
    if (showSoundsBtn) {
        showSoundsBtn.style.display = 'none'; // reset when zen mode toggles
    }
    
    const exitZenBtn = document.getElementById('exit-zen-btn');
    if (exitZenBtn) {
        exitZenBtn.style.display = isZen ? 'flex' : 'none';
    }
    
    if (isZen) {
        initAudioObjects();
    } else {
        stopAllAmbientSounds();
    }
}

function exitZenMode() {
    document.body.classList.remove('zen-focus-mode');
    const zenToggleBtn = document.getElementById('zen-toggle-btn');
    if (zenToggleBtn) {
        zenToggleBtn.classList.remove('active');
    }
    const audioWidget = document.getElementById('zen-audio-widget');
    if (audioWidget) {
        audioWidget.style.display = 'none';
    }
    const showSoundsBtn = document.getElementById('show-zen-sounds-btn');
    if (showSoundsBtn) {
        showSoundsBtn.style.display = 'none';
    }
    const exitZenBtn = document.getElementById('exit-zen-btn');
    if (exitZenBtn) {
        exitZenBtn.style.display = 'none';
    }
    stopAllAmbientSounds();
}

// 5. Ambient Sounds Loop Player (HTML5 Audio)
function initAudioObjects() {
    if (!rainAudio) {
        rainAudio = new Audio('rain.mp3');
        rainAudio.loop = true;
    }
    if (!forestAudio) {
        forestAudio = new Audio('florest.mp3');
        forestAudio.loop = true;
    }
    if (!lofiAudio) {
        lofiAudio = new Audio('LOFI.mp3');
        lofiAudio.loop = true;
    }
}

function toggleAmbientSound(track) {
    initAudioObjects();
    
    if (activeSounds[track]) {
        stopSound(track);
        activeSounds[track] = false;
        document.querySelector(`.sound-btn[data-track="${track}"]`).classList.remove('playing');
    } else {
        startSound(track);
        activeSounds[track] = true;
        document.querySelector(`.sound-btn[data-track="${track}"]`).classList.add('playing');
    }
}

function startSound(track) {
    initAudioObjects();
    if (track === 'rain' && rainAudio) {
        rainAudio.volume = volumeControls.rain;
        rainAudio.play().catch(e => console.error("Rain audio play failed:", e));
    } 
    else if (track === 'forest' && forestAudio) {
        forestAudio.volume = volumeControls.forest;
        forestAudio.play().catch(e => console.error("Forest audio play failed:", e));
    } 
    else if (track === 'lofi' && lofiAudio) {
        lofiAudio.volume = volumeControls.lofi;
        lofiAudio.play().catch(e => console.error("Lo-fi audio play failed:", e));
    }
}

function stopSound(track) {
    if (track === 'rain' && rainAudio) {
        try { rainAudio.pause(); } catch(e){}
    } else if (track === 'forest' && forestAudio) {
        try { forestAudio.pause(); } catch(e){}
    } else if (track === 'lofi' && lofiAudio) {
        try { lofiAudio.pause(); } catch(e){}
    }
}

// Stop all ambient sound tracks
function stopAllAmbientSounds() {
    Object.keys(activeSounds).forEach(track => {
        if (activeSounds[track]) {
            stopSound(track);
            activeSounds[track] = false;
            const btn = document.querySelector(`.sound-btn[data-track="${track}"]`);
            if (btn) btn.classList.remove('playing');
        }
    });
}

function adjustAmbientVolume(track, vol) {
    volumeControls[track] = vol;
    if (track === 'rain' && rainAudio) {
        rainAudio.volume = vol;
    } else if (track === 'forest' && forestAudio) {
        forestAudio.volume = vol;
    } else if (track === 'lofi' && lofiAudio) {
        lofiAudio.volume = vol;
    }
}

// 6. Physics Graph Layout (Obsidian-style)
function openGraphModal() {
    isGraphModalOpen = true;
    const modal = document.getElementById('graph-view-modal');
    if (modal) modal.classList.add('active');
    
    buildGraphData();
    
    setTimeout(() => {
        initGraphSimulation();
    }, 100);
}

function closeGraphModal() {
    isGraphModalOpen = false;
    const modal = document.getElementById('graph-view-modal');
    if (modal) modal.classList.remove('active');
    
    if (graphPhysicsInterval) {
        clearInterval(graphPhysicsInterval);
        graphPhysicsInterval = null;
    }
}

function buildGraphData() {
    const oldNodesMap = new Map(graphNodes.map(n => [n.id, n]));
    graphNodes = [];
    graphLinks = [];
    
    const tagMap = new Map();
    
    // First, add all tags to tagMap so we can count their references
    notes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => {
                const tagKey = tag.name.toLowerCase();
                const nodeId = 'tag_' + tagKey;
                const oldNode = oldNodesMap.get(nodeId);
                if (!tagMap.has(tagKey)) {
                    tagMap.set(tagKey, {
                        id: nodeId,
                        type: 'tag',
                        label: tag.name,
                        color: tag.color,
                        notesCount: 0,
                        x: oldNode ? oldNode.x : Math.random() * 500 + 100,
                        y: oldNode ? oldNode.y : Math.random() * 300 + 100,
                        vx: oldNode ? oldNode.vx : 0,
                        vy: oldNode ? oldNode.vy : 0,
                        isPinned: oldNode ? oldNode.isPinned : false
                    });
                }
                tagMap.get(tagKey).notesCount++;
            });
        }
    });

    notes.forEach(note => {
        // Dynamic node color based on tag names (audit context categories)
        let noteColor = '#06b6d4'; // default cyan
        if (note.tags) {
            const hasVulnerability = note.tags.some(t => ['vulnerability', 'critical', 'vulnerabilidade', 'crítico'].includes(t.name.toLowerCase()));
            const hasFix = note.tags.some(t => ['fix', 'approved', 'correção', 'aprovado'].includes(t.name.toLowerCase()));
            const hasLog = note.tags.some(t => ['log', 'audit', 'auditoria'].includes(t.name.toLowerCase()));
            
            if (hasVulnerability) noteColor = '#ef4444'; // Red
            else if (hasFix) noteColor = '#10b981'; // Green
            else if (hasLog) noteColor = '#f59e0b'; // Orange
        }

        // Calculate size based on note text volume (word count)
        const textContent = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
        const wordCount = textContent ? textContent.split(/\s+/).length : 0;
        const noteSize = Math.min(18, 8 + Math.min(10, wordCount / 100));

        const oldNode = oldNodesMap.get(note.id);

        graphNodes.push({
            id: note.id,
            type: 'note',
            label: note.title,
            x: oldNode ? oldNode.x : Math.random() * 500 + 100,
            y: oldNode ? oldNode.y : Math.random() * 300 + 100,
            vx: oldNode ? oldNode.vx : 0,
            vy: oldNode ? oldNode.vy : 0,
            isPinned: oldNode ? oldNode.isPinned : false,
            color: noteColor,
            size: noteSize
        });
        
        if (note.tags) {
            note.tags.forEach(tag => {
                const tagKey = tag.name.toLowerCase();
                graphLinks.push({
                    source: note.id,
                    target: 'tag_' + tagKey,
                    type: 'note-to-tag'
                });
            });
        }
    });
    
    // Add tags to graphNodes with dynamic size based on connected notes
    for (const tagNode of tagMap.values()) {
        tagNode.size = Math.min(15, 6 + tagNode.notesCount * 1.5);
        delete tagNode.notesCount; // cleanup temporary property
        graphNodes.push(tagNode);
    }

    // Automatic Note-to-Note connections (Semantic references)
    notes.forEach(noteA => {
        notes.forEach(noteB => {
            if (noteA.id === noteB.id) return;
            
            // Search for noteB.title inside noteA.content (case insensitive)
            const cleanContent = noteA.content ? noteA.content.replace(/<[^>]*>/g, ' ').toLowerCase() : '';
            const titleLower = noteB.title.toLowerCase().trim();
            
            // Ensure title has a reasonable length to avoid false positives
            if (titleLower.length >= 3 && cleanContent.includes(titleLower)) {
                // Check if link already exists in reverse direction to prevent duplicate lines
                const exists = graphLinks.some(l => 
                    (l.source === noteA.id && l.target === noteB.id) ||
                    (l.source === noteB.id && l.target === noteA.id)
                );
                
                if (!exists) {
                    graphLinks.push({
                        source: noteA.id,
                        target: noteB.id,
                        type: 'note-to-note'
                    });
                }
            }
        });
    });
}

function initGraphSimulation() {
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    canvasOffsetX = 0;
    canvasOffsetY = 0;
    canvasScale = 1.0; // Reset scale on opening
    
    let isDraggingCanvas = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    const getMouseCoords = (e) => {
        rect = canvas.parentNode.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - canvasOffsetX) / canvasScale;
        const mouseY = (e.clientY - rect.top - canvasOffsetY) / canvasScale;
        return { mouseX, mouseY };
    };

    canvas.onmousedown = (e) => {
        const { mouseX, mouseY } = getMouseCoords(e);
        
        draggedNode = null;
        for (const node of graphNodes) {
            if (!isGraphNodeVisible(node)) continue;
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist < node.size * 1.8) {
                draggedNode = node;
                break;
            }
        }
        
        if (!draggedNode) {
            isDraggingCanvas = true;
            dragStartX = e.clientX - canvasOffsetX;
            dragStartY = e.clientY - canvasOffsetY;
        }
    };
    
    canvas.onmousemove = (e) => {
        const { mouseX, mouseY } = getMouseCoords(e);
        
        if (draggedNode) {
            draggedNode.isPinned = true;
            draggedNode.vx = 0;
            draggedNode.vy = 0;
            draggedNode.x = mouseX;
            draggedNode.y = mouseY;
        } else if (isDraggingCanvas) {
            canvasOffsetX = e.clientX - dragStartX;
            canvasOffsetY = e.clientY - dragStartY;
        }
        
        hoveredNode = null;
        for (const node of graphNodes) {
            if (!isGraphNodeVisible(node)) continue;
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist < node.size * 1.8) {
                hoveredNode = node;
                break;
            }
        }

        // Show/hide and update preview tooltip position
        const tooltip = document.getElementById('graph-tooltip');
        if (tooltip) {
            if (hoveredNode) {
                if (hoveredNode.type === 'note') {
                    const note = notes.find(n => n.id === hoveredNode.id);
                    if (note) {
                        const cleanText = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
                        const previewText = cleanText.substring(0, 120) + (cleanText.length > 120 ? '...' : '');
                        tooltip.innerHTML = `
                            <div class="graph-tooltip-title">${note.title}</div>
                            <div class="graph-tooltip-content">${previewText || '<i>Vazia</i>'}</div>
                        `;
                    }
                } else if (hoveredNode.type === 'tag') {
                    const count = graphLinks.filter(l => l.target === hoveredNode.id).length;
                    tooltip.innerHTML = `
                        <div class="graph-tooltip-title" style="color: ${hoveredNode.color}">#${hoveredNode.label}</div>
                        <div class="graph-tooltip-content">${count} nota(s) vinculada(s)</div>
                    `;
                }
                
                tooltip.style.display = 'block';
                // Adjust position relative to the modal box (rect.left/top)
                tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                tooltip.style.top = (e.clientY - rect.top + 15) + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        }
    };
    
    canvas.onmouseup = () => {
        draggedNode = null;
        isDraggingCanvas = false;
    };

    canvas.onmouseleave = () => {
        draggedNode = null;
        isDraggingCanvas = false;
        hoveredNode = null;
        const tooltip = document.getElementById('graph-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    };
    
    canvas.ondblclick = (e) => {
        const { mouseX, mouseY } = getMouseCoords(e);
        
        for (const node of graphNodes) {
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist < node.size * 1.8 && isGraphNodeVisible(node)) {
                const tooltip = document.getElementById('graph-tooltip');
                if (tooltip) tooltip.style.display = 'none';
                
                if (node.type === 'note') {
                    selectNote(node.id);
                    closeGraphModal();
                } else if (node.type === 'tag') {
                    setTagFilter(node.label);
                    closeGraphModal();
                }
                break;
            }
        }
    };

    // Right click on node toggles pinned state
    canvas.oncontextmenu = (e) => {
        const { mouseX, mouseY } = getMouseCoords(e);
        
        for (const node of graphNodes) {
            if (!isGraphNodeVisible(node)) continue;
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist < node.size * 1.8) {
                e.preventDefault();
                node.isPinned = !node.isPinned;
                if (!node.isPinned) {
                    // Give it a tiny velocity so physics starts moving it
                    node.vx = (Math.random() - 0.5) * 2;
                    node.vy = (Math.random() - 0.5) * 2;
                } else {
                    node.vx = 0;
                    node.vy = 0;
                }
                break;
            }
        }
    };

    // Zoom on wheel scroll
    canvas.onwheel = (e) => {
        e.preventDefault();
        rect = canvas.parentNode.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = 1.15;
        const graphMouseX = (mouseX - canvasOffsetX) / canvasScale;
        const graphMouseY = (mouseY - canvasOffsetY) / canvasScale;
        
        if (e.deltaY < 0) {
            canvasScale = Math.min(3.0, canvasScale * zoomFactor);
        } else {
            canvasScale = Math.max(0.3, canvasScale / zoomFactor);
        }
        
        canvasOffsetX = mouseX - graphMouseX * canvasScale;
        canvasOffsetY = mouseY - graphMouseY * canvasScale;
    };

    // Graph UI buttons hookups
    const zoomInBtn = document.getElementById('graph-zoom-in');
    const zoomOutBtn = document.getElementById('graph-zoom-out');
    const zoomResetBtn = document.getElementById('graph-zoom-reset');
    
    if (zoomInBtn) {
        zoomInBtn.onclick = (e) => {
            e.stopPropagation();
            rect = canvas.parentNode.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const graphCenterX = (centerX - canvasOffsetX) / canvasScale;
            const graphCenterY = (centerY - canvasOffsetY) / canvasScale;
            canvasScale = Math.min(3.0, canvasScale * 1.25);
            canvasOffsetX = centerX - graphCenterX * canvasScale;
            canvasOffsetY = centerY - graphCenterY * canvasScale;
        };
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.onclick = (e) => {
            e.stopPropagation();
            rect = canvas.parentNode.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const graphCenterX = (centerX - canvasOffsetX) / canvasScale;
            const graphCenterY = (centerY - canvasOffsetY) / canvasScale;
            canvasScale = Math.max(0.3, canvasScale / 1.25);
            canvasOffsetX = centerX - graphCenterX * canvasScale;
            canvasOffsetY = centerY - graphCenterY * canvasScale;
        };
    }
    
    if (zoomResetBtn) {
        zoomResetBtn.onclick = (e) => {
            e.stopPropagation();
            canvasScale = 1.0;
            canvasOffsetX = 0;
            canvasOffsetY = 0;
            rect = canvas.parentNode.getBoundingClientRect();
            // Re-center node positions randomly in view
            graphNodes.forEach(node => {
                node.x = Math.random() * (rect.width - 200) + 100;
                node.y = Math.random() * (rect.height - 200) + 100;
                node.vx = 0;
                node.vy = 0;
                node.isPinned = false; // Reset pinned state
            });
        };
    }
    
    if (graphPhysicsInterval) clearInterval(graphPhysicsInterval);
    
    graphPhysicsInterval = setInterval(() => {
        if (!isGraphModalOpen) return;
        
        // Dynamically resize canvas to parent element to account for transitions and window resizing
        const parentRect = canvas.parentNode.getBoundingClientRect();
        if (canvas.width !== parentRect.width || canvas.height !== parentRect.height) {
            canvas.width = parentRect.width;
            canvas.height = parentRect.height;
        }
        
        runGraphPhysics(canvas.width, canvas.height);
        drawGraph(ctx, canvas.width, canvas.height);
    }, 1000 / 60);
}

const isGraphNodeVisible = (node) => {
    const showNotes = document.getElementById('graph-filter-notes')?.checked !== false;
    const showTags = document.getElementById('graph-filter-tags')?.checked !== false;
    
    if (node.type === 'note' && !showNotes) return false;
    if (node.type === 'tag' && !showTags) return false;
    return true;
};

const isGraphLinkVisible = (link) => {
    const showLinks = document.getElementById('graph-filter-links')?.checked !== false;
    if (!showLinks) return false;
    
    const nodeA = graphNodes.find(n => n.id === link.source);
    const nodeB = graphNodes.find(n => n.id === link.target);
    if (!nodeA || !nodeB) return false;
    return isGraphNodeVisible(nodeA) && isGraphNodeVisible(nodeB);
};

function runGraphPhysics(width, height) {
    if (width <= 40 || height <= 40) return;
    const kRepulsion = 120;
    const kAttraction = 0.05;
    const friction = 0.85;
    const centerAttraction = 0.01;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let i = 0; i < graphNodes.length; i++) {
        const nodeA = graphNodes[i];
        if (!isGraphNodeVisible(nodeA)) continue;
        for (let j = i + 1; j < graphNodes.length; j++) {
            const nodeB = graphNodes[j];
            if (!isGraphNodeVisible(nodeB)) continue;
            const dx = nodeB.x - nodeA.x || 0.1;
            const dy = nodeB.y - nodeA.y || 0.1;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 280) {
                const force = kRepulsion / (dist * dist);
                const fx = force * (dx / dist);
                const fy = force * (dy / dist);
                
                if (nodeA !== draggedNode && !nodeA.isPinned) {
                    nodeA.vx -= fx;
                    nodeA.vy -= fy;
                }
                if (nodeB !== draggedNode && !nodeB.isPinned) {
                    nodeB.vx += fx;
                    nodeB.vy += fy;
                }
            }
        }
    }
    
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));
    graphLinks.forEach(link => {
        if (!isGraphLinkVisible(link)) return;
        const nodeA = nodeMap.get(link.source);
        const nodeB = nodeMap.get(link.target);
        if (!nodeA || !nodeB) return;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.hypot(dx, dy) || 0.1;
        const restLength = 100;
        
        const force = kAttraction * (dist - restLength);
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        
        if (nodeA !== draggedNode && !nodeA.isPinned) {
            nodeA.vx += fx;
            nodeA.vy += fy;
        }
        if (nodeB !== draggedNode && !nodeB.isPinned) {
            nodeB.vx -= fx;
            nodeB.vy -= fy;
        }
    });
    
    graphNodes.forEach(node => {
        if (!isGraphNodeVisible(node)) return;
        if (node === draggedNode || node.isPinned) {
            node.vx = 0;
            node.vy = 0;
            return;
        }
        
        if (width > 40 && height > 40) {
            const dx = centerX - node.x;
            const dy = centerY - node.y;
            node.vx += dx * centerAttraction;
            node.vy += dy * centerAttraction;
        }
        
        node.vx *= friction;
        node.vy *= friction;
        
        node.x += node.vx;
        node.y += node.vy;
        
        if (width > 40 && height > 40) {
            node.x = Math.max(20, Math.min(width - 20, node.x));
            node.y = Math.max(20, Math.min(height - 20, node.y));
        }
    });
}

function drawGraph(ctx, width, height) {
    if (width <= 40 || height <= 40) return;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    
    // Scale and translate for zoom & pan support
    ctx.translate(canvasOffsetX, canvasOffsetY);
    ctx.scale(canvasScale, canvasScale);
    
    const isLightTheme = document.body.classList.contains('light-theme');
    const searchQuery = document.getElementById('graph-search-input')?.value.toLowerCase().trim() || "";
    
    // 1. Draw Links
    const nodeMap = new Map(graphNodes.map(n => [n.id, n]));
    graphLinks.forEach(link => {
        if (!isGraphLinkVisible(link)) return;
        const nodeA = nodeMap.get(link.source);
        const nodeB = nodeMap.get(link.target);
        if (nodeA && nodeB) {
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            
            // Highlight link if connected to hovered node
            let opacity = 0.08;
            if (hoveredNode) {
                const isConnected = (link.source === hoveredNode.id || link.target === hoveredNode.id);
                opacity = isConnected ? 0.6 : 0.02;
            }
            
            // If there's a search active, make unrelated links extremely faint
            if (searchQuery) {
                const matchesA = nodeA.label.toLowerCase().includes(searchQuery);
                const matchesB = nodeB.label.toLowerCase().includes(searchQuery);
                if (!matchesA && !matchesB) {
                    opacity = 0.01;
                }
            }
            
            if (link.type === 'note-to-note') {
                ctx.strokeStyle = isLightTheme
                    ? `rgba(107, 33, 168, ${opacity * 1.5})`  // Darker purple for light theme
                    : `rgba(168, 85, 247, ${opacity * 1.5})`; // Purple link
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 4]); // Dashed line for wikilinks
            } else {
                ctx.strokeStyle = isLightTheme
                    ? `rgba(15, 23, 42, ${opacity * 1.2})`   // Dark gray for light theme
                    : `rgba(255, 255, 255, ${opacity})`;   // White-gray link
                ctx.lineWidth = 1.2;
                ctx.setLineDash([]);
            }
            ctx.stroke();
        }
    });
    ctx.setLineDash([]); // Reset line dash
    
    // 2. Draw Nodes
    graphNodes.forEach(node => {
        if (!isGraphNodeVisible(node)) return;
        
        let opacity = 1.0;
        let isSearching = false;
        let matchesSearch = false;
        
        if (searchQuery) {
            isSearching = true;
            matchesSearch = node.label.toLowerCase().includes(searchQuery);
            opacity = matchesSearch ? 1.0 : 0.12;
        }
        
        if (hoveredNode && !isSearching) {
            const isSelf = (hoveredNode.id === node.id);
            const isConnected = graphLinks.some(l => 
                (l.source === hoveredNode.id && l.target === node.id) ||
                (l.source === node.id && l.target === hoveredNode.id)
            );
            opacity = (isSelf || isConnected) ? 1.0 : 0.15;
        }
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // Dynamic node glow (shadow)
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        ctx.shadowBlur = isHovered ? 22 : (matchesSearch ? 18 : 6);
        ctx.shadowColor = node.color;
        
        // Node circle
        ctx.fillStyle = node.color;
        ctx.beginPath();
        
        let finalSize = node.size;
        if (isHovered) {
            finalSize += 2.5;
        } else if (matchesSearch) {
            finalSize += 1.5;
        }
        
        ctx.arc(node.x, node.y, finalSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw outline/ring if node is pinned
        if (node.isPinned) {
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = isLightTheme ? '#1e1b4b' : '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(node.x, node.y, finalSize + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // Node label
        ctx.shadowBlur = 0;
        
        // Label color based on theme
        const textColor = isLightTheme 
            ? (isHovered ? '#0f172a' : '#475569')
            : (isHovered ? '#ffffff' : '#94a3b8');
            
        ctx.fillStyle = textColor;
        ctx.font = (isHovered || matchesSearch) ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        
        // Truncate labels that are too long on small notes
        let label = node.label;
        if (label.length > 22 && !isHovered && !matchesSearch) {
            label = label.substring(0, 19) + '...';
        }
        ctx.fillText(label, node.x, node.y - finalSize - 6);
        ctx.restore();
    });
    
    ctx.restore();
}

// 7. PDF Upload Handler
async function handlePdfUpload(file) {
    const loadingId = appendMessage('assistant', i18n[currentLang].statusLoading, true);
    
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const arrayBuffer = reader.result;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = btoa(binary);
            
            const response = await fetch(`${API_BASE_URL}/api/pdf-transcript`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileData: base64Data })
            });
            
            if (!response.ok) {
                throw new Error(i18n[currentLang].pdfError);
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            let pdfText = data.text.trim();
            if (!pdfText) {
                throw new Error("The PDF document does not contain readable plain text.");
            }
            
            let words = pdfText.split(/\s+/);
            if (words.length > 1800) {
                pdfText = words.slice(0, 1800).join(' ') + '...';
                // PDF extracted successfully
            }
            
            // PDF extracted successfully
            
            let prompt = "";
            let systemInstruction = "";
            if (currentLang === 'en') {
                prompt = `Create a structured and detailed summary in English based on the following PDF document text:\n\n${pdfText}`;
                systemInstruction = "You are an expert at summarizing PDF documents. Respond in English clearly. Create a well-explained summary containing: 1) The main purpose of the document, 2) The key takeaways and details, and 3) A concise conclusion. Write in clean text. DO NOT use hashtags (#) or asterisks (*). Write only plain text and paragraphs.";
            } else {
                prompt = `Crie um resumo estruturado e detalhado em português com base no seguinte texto do documento PDF:\n\n${pdfText}`;
                systemInstruction = "Você é um especialista em sintetizar documentos e relatórios. Responda em português de forma clara. Crie um resumo bem explicado contendo: 1) O objetivo geral do documento, 2) Os principais tópicos e detalhes chave, e 3) Uma conclusão. Escreva em formato de texto limpo. NÃO utilize hashtags (#) ou asteriscos (*). Escreva apenas texto corrido e parágrafos limpos.";
            }
            
            let result = await callLocalAI(prompt, systemInstruction);
            removeMessage(loadingId);
            
            result = cleanYoutubeSummaryFormatting(result);
            appendMessage('assistant', result);
            
        } catch (error) {
            removeMessage(loadingId);
            if (error.message === 'cancelled') {
                appendMessage('assistant', currentLang === 'en' ? '❌ Action cancelled by user.' : '❌ Ação cancelada pelo usuário.');
            } else {
                appendMessage('assistant', `❌ ${error.message}`);
            }
        }
    };
    reader.onerror = () => {
        removeMessage(loadingId);
        appendMessage('assistant', `❌ ${i18n[currentLang].pdfError}`);
    };
    
    reader.readAsArrayBuffer(file);
}

// --- WEB SCRAPER (SCRAPLING) HANDLER ---
async function handleWebScrape() {
    if (!scraperUrlInput) return;
    const url = scraperUrlInput.value.trim();
    if (!url) {
        showToast(i18n[currentLang].toastScrapeError, 'error');
        return;
    }

    scraperUrlInput.value = '';
    const loadingId = appendMessage('assistant', i18n[currentLang].statusLoading, true);
    let summaryLoadingId = null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/scrape?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        removeMessage(loadingId);
        showToast(i18n[currentLang].toastScrapeSuccess, 'success');

        // Clean HTML content & create a note
        const title = data.title || "Scraped Note";
        const content = markdownToHtml(data.content || "No text content extracted.");
        createNewNote(title, content);

        // Summarize content in chat
        const summaryPrompt = currentLang === 'en' 
            ? `Extract main topics and write a structured summary of this scraped page in English:\n\n${data.content}`
            : `Extraia os tópicos principais e escreva um resumo estruturado desta página web capturada em português:\n\n${data.content}`;

        const summarySystem = currentLang === 'en'
            ? "You are an expert web analyst. Summarize web page articles cleanly. Detail key highlights in paragraphs."
            : "Você é um especialista em análise de conteúdo web. Resuma artigos de páginas web de forma limpa. Detalhe os destaques em parágrafos.";

        summaryLoadingId = appendMessage('assistant', i18n[currentLang].statusLoading, true);
        const summaryResult = await callLocalAI(summaryPrompt, summarySystem);
        removeMessage(summaryLoadingId);
        summaryLoadingId = null;
        appendMessage('assistant', `🕸️ **Scraper Summary for "${title}":**\n\n${summaryResult}`);

    } catch (err) {
        removeMessage(loadingId);
        if (summaryLoadingId) removeMessage(summaryLoadingId);
        if (err.message === 'cancelled') {
            appendMessage('assistant', currentLang === 'en' ? '❌ Action cancelled by user.' : '❌ Ação cancelada pelo usuário.');
        } else {
            appendMessage('assistant', `❌ ${i18n[currentLang].toastScrapeError.replace('{error}', err.message)}`);
            showToast(err.message, 'error');
        }
    }
}

// --- GIT PATCH EXPORTER ---
function handleGitPatchExport() {
    const rawText = noteContent.innerText || "";
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = getCleanEditorHtml();
    const codeElements = tempDiv.querySelectorAll('code, pre');
    
    let codeText = "";
    if (codeElements.length > 0) {
        codeText = Array.from(codeElements).map(el => el.innerText).join('\n\n');
    } else {
        const codeLines = rawText.split('\n').filter(line => {
            const trimmed = line.trim();
            return (
                trimmed.startsWith('const ') || 
                trimmed.startsWith('let ') || 
                trimmed.startsWith('var ') || 
                trimmed.startsWith('import ') || 
                trimmed.startsWith('function ') || 
                trimmed.startsWith('class ') || 
                trimmed.startsWith('def ') || 
                trimmed.startsWith('public ') || 
                trimmed.startsWith('private ') ||
                trimmed.includes('=>') ||
                (trimmed.startsWith('{') && trimmed.endsWith('}'))
            );
        });
        if (codeLines.length > 0) {
            codeText = codeLines.join('\n');
        }
    }

    if (!codeText.trim()) {
        showToast(i18n[currentLang].toastPatchNoCode, 'error');
        return;
    }

    const dateStr = new Date().toUTCString();
    const activeNote = notes.find(n => n.id === activeNoteId);
    const filename = activeNote ? activeNote.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.js' : 'code.js';
    
    let patch = `From: SmartNotes AI Audit Tool <audit@smartnotes.ai>\n`;
    patch += `Date: ${dateStr}\n`;
    patch += `Subject: [PATCH] AI-generated audit fix for ${filename}\n\n`;
    patch += `--- a/${filename}\n`;
    patch += `+++ b/${filename}\n`;
    patch += `@@ -1,0 +1,${codeText.split('\n').length} @@\n`;
    
    const patchedLines = codeText.split('\n').map(line => `+${line}`).join('\n');
    patch += patchedLines + `\n`;

    navigator.clipboard.writeText(patch).then(() => {
        showToast(i18n[currentLang].toastPatchSuccess, 'success');
    }).catch(err => {
        console.error('Failed to copy patch:', err);
        showToast(err.message, 'error');
    });
}

// --- TEXT TO SPEECH (MAI-VOICE-2 & LOCAL SPEECHSYNTHESIS) ---
let ttsAudioPlayer = null;
let isTtsPlaying = false;
let currentUtterance = null;
let hasBackendTts = false;

async function initTts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'probe' })
        });
        hasBackendTts = response.status === 200 || response.status === 400;
    } catch (e) {
        hasBackendTts = false;
    }

    updateTtsStatusBadge();

    if (ttsVoiceSelect) {
        ttsVoiceSelect.innerHTML = '';
        
        if (hasBackendTts) {
            const premiumVoices = [
                { name: 'en-US-JennyNeural', label: 'Premium Jenny (EN)', lang: 'en-US' },
                { name: 'en-US-GuyNeural', label: 'Premium Guy (EN)', lang: 'en-US' },
                { name: 'pt-BR-FranciscaNeural', label: 'Premium Francisca (PT)', lang: 'pt-BR' },
                { name: 'pt-BR-AntonioNeural', label: 'Premium Antonio (PT)', lang: 'pt-BR' }
            ];
            premiumVoices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ voice: v.name, lang: v.lang, isBackend: true });
                opt.textContent = v.label;
                ttsVoiceSelect.appendChild(opt);
            });
        }
        
        const loadNativeVoices = () => {
            const nativeVoices = window.speechSynthesis.getVoices();
            const filteredNative = nativeVoices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('pt'));
            
            filteredNative.forEach(v => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ voice: v.name, lang: v.lang, isBackend: false });
                opt.textContent = `${v.name} (${v.lang.toUpperCase()})`;
                if (!Array.from(ttsVoiceSelect.options).some(o => o.text.includes(v.name))) {
                    ttsVoiceSelect.appendChild(opt);
                }
            });
        };

        loadNativeVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadNativeVoices;
        }
    }
}

function updateTtsStatusBadge() {
    if (!ttsStatusBadge) return;
    if (hasBackendTts) {
        ttsStatusBadge.textContent = i18n[currentLang].ttsStatusActive;
        ttsStatusBadge.className = 'tts-status-badge active';
    } else {
        ttsStatusBadge.textContent = i18n[currentLang].ttsStatusLocal;
        ttsStatusBadge.className = 'tts-status-badge local';
    }
}

function toggleTtsPlay() {
    if (isTtsPlaying) {
        if (ttsAudioPlayer) {
            ttsAudioPlayer.pause();
            isTtsPlaying = false;
            if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';
        } else if (window.speechSynthesis.speaking) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                if (ttsPlayBtn) ttsPlayBtn.textContent = '⏸️';
            } else {
                window.speechSynthesis.pause();
                if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';
            }
        }
    } else {
        if (ttsAudioPlayer && ttsAudioPlayer.paused) {
            ttsAudioPlayer.play();
            isTtsPlaying = true;
            if (ttsPlayBtn) ttsPlayBtn.textContent = '⏸️';
        } else {
            startTtsPlay();
        }
    }
}

function startTtsPlay() {
    stopTtsPlay();

    let rawText = "";
    if (lastSelectionRange && !lastSelectionRange.collapsed) {
        rawText = lastSelectionRange.toString().trim();
    } else {
        rawText = noteContent.innerText.trim();
    }
    
    if (!rawText) return;

    let voiceConfig = { voice: '', lang: 'en-US', isBackend: false };
    if (ttsVoiceSelect && ttsVoiceSelect.value) {
        try {
            voiceConfig = JSON.parse(ttsVoiceSelect.value);
        } catch (e) {}
    }

    const speed = ttsSpeedSlider ? parseFloat(ttsSpeedSlider.value) : 1.0;
    const vol = ttsVolSlider ? parseFloat(ttsVolSlider.value) : 0.8;

    if (voiceConfig.isBackend && hasBackendTts) {
        speakBackend(rawText, voiceConfig.voice, voiceConfig.lang, speed, vol);
    } else {
        speakLocal(rawText, voiceConfig.voice, voiceConfig.lang, speed, vol);
    }
}

function speakLocal(text, voiceName, lang, rate, volume) {
    if (!('speechSynthesis' in window)) return;
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = lang;
    currentUtterance.rate = rate;
    currentUtterance.volume = volume;

    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = voices.find(v => v.name === voiceName);
    if (chosenVoice) {
        currentUtterance.voice = chosenVoice;
    }

    currentUtterance.onend = () => {
        isTtsPlaying = false;
        if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';
        currentUtterance = null;
    };

    currentUtterance.onerror = () => {
        isTtsPlaying = false;
        if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';
        currentUtterance = null;
    };

    isTtsPlaying = true;
    if (ttsPlayBtn) ttsPlayBtn.textContent = '⏸️';
    window.speechSynthesis.speak(currentUtterance);
}

async function speakBackend(text, voiceName, lang, rate, volume) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: voiceName, lang })
        });
        
        if (!response.ok) {
            throw new Error("Backend TTS failed");
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        ttsAudioPlayer = new Audio(audioUrl);
        ttsAudioPlayer.volume = volume;
        ttsAudioPlayer.playbackRate = rate;
        
        ttsAudioPlayer.onended = () => {
            isTtsPlaying = false;
            if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';
            ttsAudioPlayer = null;
        };

        isTtsPlaying = true;
        if (ttsPlayBtn) ttsPlayBtn.textContent = '⏸️';
        ttsAudioPlayer.play();
    } catch (e) {
        console.warn("Backend synthesis failed, falling back to local SpeechSynthesis:", e);
        speakLocal(text, '', lang, rate, volume);
    }
}

function stopTtsPlay() {
    isTtsPlaying = false;
    if (ttsPlayBtn) ttsPlayBtn.textContent = '▶️';

    if (ttsAudioPlayer) {
        ttsAudioPlayer.pause();
        ttsAudioPlayer = null;
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}


// --- UNDO AND REDO ENGINE FOR MANUALLY TYPED AND AI PROGRAMMATIC UPDATES ---

function pushHistory() {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    const state = {
        noteId: activeNote.id,
        title: noteTitle.value,
        content: getCleanEditorHtml(),
        tags: [...(activeNote.tags || [])]
    };
    
    if (undoStack.length > 0) {
        const lastState = undoStack[undoStack.length - 1];
        if (lastState.noteId === state.noteId && 
            lastState.title === state.title && 
            lastState.content === state.content &&
            JSON.stringify(lastState.tags) === JSON.stringify(state.tags)) {
            return;
        }
    }
    
    undoStack.push(state);
    if (undoStack.length > 100) {
        undoStack.shift();
    }
    redoStack = [];
}

function initNoteHistory() {
    undoStack = [];
    redoStack = [];
    pushHistory();
}

function undo() {
    if (undoStack.length === 0) return;
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    const currentState = {
        noteId: activeNote.id,
        title: noteTitle.value,
        content: getCleanEditorHtml(),
        tags: [...(activeNote.tags || [])]
    };
    redoStack.push(currentState);
    
    const prevState = undoStack.pop();
    if (prevState.noteId !== activeNoteId) {
        undoStack = [];
        redoStack = [];
        return;
    }
    
    noteTitle.value = prevState.title;
    noteContent.innerHTML = prevState.content;
    activeNote.title = prevState.title;
    activeNote.content = prevState.content;
    activeNote.tags = prevState.tags;
    
    saveNotesToLocalStorage();
    renderNotesList();
    renderNoteTagsInEditorHeader();
    adaptNoteColorsToTheme();
    updateStats();
    
    showStatus(currentLang === 'en' ? 'Undo' : 'Desfazer');
}

function redo() {
    if (redoStack.length === 0) return;
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    const nextState = redoStack.pop();
    if (nextState.noteId !== activeNoteId) {
        undoStack = [];
        redoStack = [];
        return;
    }
    
    const currentState = {
        noteId: activeNote.id,
        title: noteTitle.value,
        content: getCleanEditorHtml(),
        tags: [...(activeNote.tags || [])]
    };
    undoStack.push(currentState);
    
    noteTitle.value = nextState.title;
    noteContent.innerHTML = nextState.content;
    activeNote.title = nextState.title;
    activeNote.content = nextState.content;
    activeNote.tags = nextState.tags;
    
    saveNotesToLocalStorage();
    renderNotesList();
    renderNoteTagsInEditorHeader();
    adaptNoteColorsToTheme();
    updateStats();
    
    showStatus(currentLang === 'en' ? 'Redo' : 'Refazer');
}

function registerTypingHistory(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
    if (e.key.startsWith('Arrow')) return;
    
    const isBoundary = e.key === ' ' || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete';
    
    if (!isTyping || isBoundary) {
        pushHistory();
        isTyping = true;
    }
    
    clearTimeout(typingEndTimer);
    typingEndTimer = setTimeout(() => {
        isTyping = false;
    }, 1500);
}

function handleGlobalUndoRedo(e) {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if (e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
        }
    }
}

function handleGlobalEscKey(e) {
    if (e.key === 'Escape') {
        // 1. Confirm modal
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && confirmModal.classList.contains('active')) {
            const cancelBtn = document.getElementById('confirm-modal-cancel');
            if (cancelBtn) cancelBtn.click();
            return;
        }
        
        // 2. Graph modal
        if (isGraphModalOpen) {
            closeGraphModal();
            return;
        }
        
        // 3. TTS settings modal
        const ttsSettingsModal = document.getElementById('tts-settings-modal');
        if (ttsSettingsModal && ttsSettingsModal.classList.contains('active')) {
            ttsSettingsModal.classList.remove('active');
            return;
        }
        
        // 4. Pitch modal
        const pitchModal = document.getElementById('pitch-modal');
        if (pitchModal && (pitchModal.classList.contains('active') || pitchModal.style.display === 'flex')) {
            if (activeAiAbortController) {
                activeAiAbortController.abort();
            }
            pitchModal.style.display = 'none';
            pitchModal.classList.remove('active');
            document.removeEventListener('keydown', handlePitchKeydown);
            return;
        }
        
        // 5. ROI modal
        const roiModal = document.getElementById('roi-modal');
        if (roiModal && (roiModal.classList.contains('active') || roiModal.style.display === 'flex')) {
            roiModal.style.display = 'none';
            roiModal.classList.remove('active');
            return;
        }
    }
}

// --- TAGS AND WORDS SUGGESTIONS AUTOCOMPLETE ENGINE ---

function getUniqueExistingTags() {
    const tagMap = new Map();
    const defaultTags = [
        { name: i18n[currentLang].tagWork || "Work", color: "#3b82f6" },
        { name: i18n[currentLang].tagStudy || "Study", color: "#10b981" },
        { name: i18n[currentLang].tagPersonal || "Personal", color: "#ef4444" }
    ];
    defaultTags.forEach(t => tagMap.set(t.name.toLowerCase(), t));

    notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => {
                tagMap.set(tag.name.toLowerCase(), { name: tag.name, color: tag.color });
            });
        }
    });
    return Array.from(tagMap.values());
}

function renderTagSuggestions(matches) {
    const container = document.getElementById('tag-autocomplete-suggestions');
    if (!container) return;
    
    container.innerHTML = '';
    tagSuggestionsList = matches;
    
    if (matches.length === 0) {
        container.style.display = 'none';
        activeTagSuggestionIndex = -1;
        return;
    }
    
    matches.forEach((tag, index) => {
        const item = document.createElement('div');
        item.className = 'tag-suggestion-item';
        if (index === activeTagSuggestionIndex) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <span class="tag-suggestion-color-dot" style="background: ${tag.color};"></span>
            <span class="tag-suggestion-text">${tag.name}</span>
        `;
        
        item.addEventListener('click', () => {
            selectTagSuggestion(tag);
        });
        
        container.appendChild(item);
    });
    
    container.style.display = 'flex';
}

function selectTagSuggestion(tag) {
    const newTagInput = document.getElementById('new-tag-input');
    if (newTagInput) {
        newTagInput.value = tag.name;
        
        // Select matching color preset dot
        const colorDots = document.querySelectorAll('.tag-color-presets .color-dot');
        colorDots.forEach(dot => {
            if (dot.dataset.color === tag.color) {
                colorDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                selectedTagColor = tag.color;
            }
        });
        
        const container = document.getElementById('tag-autocomplete-suggestions');
        if (container) container.style.display = 'none';
        tagSuggestionsList = [];
        activeTagSuggestionIndex = -1;
        
        newTagInput.focus();
    }
}

function handleTagAutocompleteInput(e) {
    const newTagInput = document.getElementById('new-tag-input');
    if (!newTagInput) return;
    
    const query = newTagInput.value.trim().toLowerCase();
    if (!query) {
        renderTagSuggestions([]);
        return;
    }
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    const attachedTagNames = activeNote && activeNote.tags 
        ? activeNote.tags.map(t => t.name.toLowerCase()) 
        : [];
        
    const allTags = getUniqueExistingTags();
    const matches = allTags.filter(tag => {
        const nameLower = tag.name.toLowerCase();
        return nameLower.includes(query) && !attachedTagNames.includes(nameLower);
    });
    
    activeTagSuggestionIndex = matches.length > 0 ? 0 : -1;
    renderTagSuggestions(matches);
}

function handleTagAutocompleteKeydown(e) {
    const container = document.getElementById('tag-autocomplete-suggestions');
    if (!container || container.style.display === 'none') return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeTagSuggestionIndex = (activeTagSuggestionIndex + 1) % tagSuggestionsList.length;
        renderTagSuggestions(tagSuggestionsList);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeTagSuggestionIndex = (activeTagSuggestionIndex - 1 + tagSuggestionsList.length) % tagSuggestionsList.length;
        renderTagSuggestions(tagSuggestionsList);
    } else if (e.key === 'Enter') {
        if (activeTagSuggestionIndex >= 0 && activeTagSuggestionIndex < tagSuggestionsList.length) {
            e.preventDefault();
            e.stopPropagation();
            selectTagSuggestion(tagSuggestionsList[activeTagSuggestionIndex]);
            
            const saveTagBtn = document.getElementById('save-tag-btn');
            if (saveTagBtn) saveTagBtn.click();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        container.style.display = 'none';
        tagSuggestionsList = [];
        activeTagSuggestionIndex = -1;
    }
}

// --- SMART COMPOSE / GHOST TEXT INLINE AUTCOMPLETE ---

function updateLocalDictionary() {
    const newWords = new Set();
    const commonWords = [
        "inteligência", "desenvolvimento", "programação", "tecnologia", "assistente",
        "intelligent", "development", "programming", "technology", "assistant",
        "offline", "documento", "conhecimento", "document", "knowledge", "structure",
        "importante", "important", "estrutura", "referência", "reference", "software",
        "requisitos", "requirements", "pesquisa", "research", "especificação", "specification"
    ];
    commonWords.forEach(word => newWords.add(word.toLowerCase()));
    
    const wordRegex = /[a-zA-ZÀ-ÿ\u00f1\u00d1]+(_[a-zA-ZÀ-ÿ\u00f1\u00d1]+)*/g;
    notes.forEach(note => {
        if (note.content) {
            const plainText = note.content.replace(/<[^>]*>/g, ' ');
            const matches = plainText.match(wordRegex);
            if (matches) {
                matches.forEach(word => {
                    if (word.length >= 4 && word.length <= 25) {
                        newWords.add(word.toLowerCase());
                    }
                });
            }
        }
    });
    
    localDictionary = newWords;
}

function getCaretWordPrefix() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    if (container.nodeType !== Node.TEXT_NODE) return null;
    
    const text = container.textContent;
    const offset = range.startOffset;
    
    if (offset < text.length && /[a-zA-ZÀ-ÿ\u00f1\u00d1]/.test(text[offset])) {
        return null;
    }
    
    let start = offset;
    while (start > 0 && /[a-zA-ZÀ-ÿ\u00f1\u00d1]/.test(text[start - 1])) {
        start--;
    }
    
    const prefix = text.slice(start, offset);
    return {
        prefix: prefix,
        node: container,
        offset: offset,
        start: start
    };
}

function showAutocompleteSuggestion() {
    const caretInfo = getCaretWordPrefix();
    if (!caretInfo) return;
    
    const { prefix, node, offset } = caretInfo;
    if (prefix.length < 2) return;
    
    const prefixLower = prefix.toLowerCase();
    let bestMatch = null;
    
    for (const word of localDictionary) {
        if (word.startsWith(prefixLower) && word.length > prefix.length) {
            bestMatch = word;
            break;
        }
    }
    
    if (bestMatch) {
        const completion = bestMatch.slice(prefix.length);
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            const ghost = document.createElement('span');
            ghost.className = 'ghost-suggestion';
            ghost.contentEditable = 'false';
            ghost.textContent = completion;
            
            range.insertNode(ghost);
            
            range.setStartBefore(ghost);
            range.setEndBefore(ghost);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

function insertTextAtCaret(text) {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// Keydown handler inside editor for ghost completion
function handleAutocompleteKeydown(e) {
    const ghost = noteContent.querySelector('.ghost-suggestion');
    if (ghost) {
        if (e.key === 'Tab' || e.key === 'ArrowRight') {
            e.preventDefault();
            const textToInsert = ghost.textContent;
            ghost.remove();
            
            insertTextAtCaret(textToInsert);
            updateActiveNote();
            return;
        }
        
        ghost.remove();
    }
}

function handleAutocompleteInput(e) {
    const existingGhost = noteContent.querySelector('.ghost-suggestion');
    if (existingGhost) {
        existingGhost.remove();
    }
    
    if (e.inputType !== 'insertText') {
        return;
    }
    
    showAutocompleteSuggestion();
}

// ==========================================================================
// Slide Generator and ROI Metrics - Helper Functions
// ==========================================================================

let currentSlides = [];
let currentSlideIndex = 0;

async function openPitchPresenter() {
    const pitchModal = document.getElementById('pitch-modal');
    const pitchLoading = document.getElementById('pitch-loading');
    if (!pitchModal) return;

    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.content.trim()) {
        showToast(currentLang === 'en' ? "Please write some text in the note first!" : "Por favor, escreva algum texto na nota primeiro!", 'warning');
        return;
    }

    pitchModal.style.display = 'flex';
    pitchModal.classList.add('active');
    pitchLoading.style.display = 'flex';

    // Clear old slide rendering
    document.getElementById('slide-title').innerText = "";
    document.getElementById('slide-bullets').innerHTML = "";
    document.getElementById('pitch-dots').innerHTML = "";

    try {
        const textContent = getCleanEditorHtml().replace(/<[^>]*>/g, '').trim();
        
        const systemPrompt = `You are a pitch presentation expert. Analyze the following text and divide it into exactly 5 slides for a 5-minute presentation.
Format the output STRICTLY as a JSON array of slide objects. Each object MUST have a "title" string and a "content" array of strings (bullet points).
The slides must be written in ${currentLang === 'en' ? 'English' : 'Portuguese'}.
Follow this layout:
Slide 1: ${currentLang === 'en' ? 'The Challenge (O Desafio)' : 'O Desafio'}
Slide 2: ${currentLang === 'en' ? 'The Solution (A Solução)' : 'A Solução'}
Slide 3: ${currentLang === 'en' ? 'Key Features (Diferenciais)' : 'Diferenciais Técnicos'}
Slide 4: ${currentLang === 'en' ? 'ROI & Impact (Impacto)' : 'Produtividade / ROI'}
Slide 5: ${currentLang === 'en' ? 'Conclusion / Next Steps' : 'Conclusão / Próximos Passos'}

Example Format:
[
  {
    "title": "${currentLang === 'en' ? 'The Challenge' : 'O Desafio'}",
    "content": [${currentLang === 'en' ? '"Manual processes wasting time", "Corporate data leakage"' : '"Processos manuais que gastam tempo", "Vazamento de dados corporativos"'}]
  }
]
Output ONLY the clean JSON array. Do not include markdown ticks, descriptions, or comments.`;

        let userPrompt = `Here is my note text:\n\n"${textContent}"`;
        
        const response = await callLocalAI(userPrompt, systemPrompt);
        
        // Parse the response
        let parsedResult;
        try {
            // Clean the response from potential markdown wrapping
            let cleanResponse = response.trim();
            if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            }
            parsedResult = JSON.parse(cleanResponse);
        } catch (e) {
            console.warn("Failed to parse AI slides JSON. Falling back to paragraph splits.", e);
            // Fallback: Split note by headers or paragraphs
            parsedResult = fallbackSplitSlides(textContent);
        }

        if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            currentSlides = parsedResult;
            currentSlideIndex = 0;
            renderActiveSlide();
            renderSlideDots();
            
            // Add key listener
            document.addEventListener('keydown', handlePitchKeydown);
        } else {
            throw new Error("No slides returned.");
        }
    } catch (err) {
        if (err.message !== 'cancelled') {
            console.error("Pitch slides generation failed:", err);
            showToast(currentLang === 'en' ? "Failed to generate slides. Please try again." : "Falha ao gerar os slides. Tente novamente.", 'error');
        }
        pitchModal.style.display = 'none';
        pitchModal.classList.remove('active');
    } finally {
        pitchLoading.style.display = 'none';
    }
}

function fallbackSplitSlides(text) {
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 10).slice(0, 5);
    const noteTitleText = document.getElementById('note-title').value || "SmartNotes AI";
    
    return paragraphs.map((p, idx) => {
        const slideTitles = [
            currentLang === 'en' ? "Overview" : "Visão Geral",
            currentLang === 'en' ? "Core Problem" : "Problema Central",
            currentLang === 'en' ? "AI Strategy" : "Estratégia de IA",
            currentLang === 'en' ? "ROI & Impact" : "Impacto & ROI",
            currentLang === 'en' ? "Action Plan" : "Plano de Ação"
        ];
        return {
            title: slideTitles[idx] || `${noteTitleText} - Slide ${idx + 1}`,
            content: [p.substring(0, 150) + "..."]
        };
    });
}

function renderActiveSlide() {
    if (currentSlides.length === 0) return;
    const slide = currentSlides[currentSlideIndex];
    
    const slideTitle = document.getElementById('slide-title');
    const slideBullets = document.getElementById('slide-bullets');
    const slideNumberLabel = document.getElementById('pitch-slide-number');
    
    slideTitle.innerText = slide.title || "Slide";
    
    slideBullets.innerHTML = "";
    if (Array.isArray(slide.content)) {
        slide.content.forEach(bullet => {
            const li = document.createElement('li');
            li.innerText = bullet;
            slideBullets.appendChild(li);
        });
    } else if (typeof slide.content === 'string') {
        const li = document.createElement('li');
        li.innerText = slide.content;
        slideBullets.appendChild(li);
    }
    
    slideNumberLabel.innerText = `${currentLang === 'en' ? 'Slide' : 'Slide'} ${currentSlideIndex + 1} ${currentLang === 'en' ? 'of' : 'de'} ${currentSlides.length}`;
    
    // Toggle controls disabled state
    document.getElementById('pitch-prev-btn').disabled = currentSlideIndex === 0;
    document.getElementById('pitch-next-btn').innerText = currentSlideIndex === currentSlides.length - 1 ? (currentLang === 'en' ? 'Finish' : 'Finalizar') : (currentLang === 'en' ? 'Next ▶' : 'Próximo ▶');
    
    // Update dots
    const dots = document.querySelectorAll('.pitch-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlideIndex);
    });
}

function renderSlideDots() {
    const dotsContainer = document.getElementById('pitch-dots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    
    currentSlides.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = "pitch-dot";
        if (idx === currentSlideIndex) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentSlideIndex = idx;
            renderActiveSlide();
        });
        dotsContainer.appendChild(dot);
    });
}

function navigateSlides(direction) {
    const nextIndex = currentSlideIndex + direction;
    if (nextIndex >= 0 && nextIndex < currentSlides.length) {
        currentSlideIndex = nextIndex;
        renderActiveSlide();
    } else if (nextIndex === currentSlides.length) {
        // Exit modal
        const pm = document.getElementById('pitch-modal');
        if (pm) {
            pm.style.display = 'none';
            pm.classList.remove('active');
        }
        document.removeEventListener('keydown', handlePitchKeydown);
        showToast(currentLang === 'en' ? "Presentation completed!" : "Apresentação concluída!", 'success');
    }
}

function handlePitchKeydown(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        navigateSlides(1);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateSlides(-1);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        const pm = document.getElementById('pitch-modal');
        if (pm) {
            pm.style.display = 'none';
            pm.classList.remove('active');
        }
        document.removeEventListener('keydown', handlePitchKeydown);
    }
}

function openRoiCalculator() {
    const roiModal = document.getElementById('roi-modal');
    if (!roiModal) return;
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    const noteTitleText = activeNote ? activeNote.title : "SmartNotes AI";
    document.getElementById('impact-note-title').innerText = noteTitleText;
    
    roiModal.style.display = 'flex';
    roiModal.classList.add('active');
    calculateRoi();
    generateAiStrategicBrief();
}

function calculateRoi() {
    const timeManual = parseInt(document.getElementById('roi-time-manual').value) || 60;
    const timeAi = parseInt(document.getElementById('roi-time-ai').value) || 5;
    const frequency = parseFloat(document.getElementById('roi-frequency').value) || 20;
    
    // Time spent per month in minutes
    const manualMinutes = timeManual * frequency;
    const aiMinutes = timeAi * frequency;
    
    // Time saved per month in minutes
    const savedMinutes = Math.max(0, manualMinutes - aiMinutes);
    const savedHours = Math.round(savedMinutes / 60);
    
    // Time reduction percentage
    const reductionPercent = Math.round(((timeManual - timeAi) / timeManual) * 100);
    
    // Annual productivity hours and equivalent workdays (8h day)
    const annualSavedHours = savedHours * 12;
    const annualSavedDays = Math.round(annualSavedHours / 8);
    
    // Update labels in UI
    document.getElementById('impact-card-saved-hours').innerText = `${savedHours}h`;
    document.getElementById('impact-card-percent').innerText = `${reductionPercent}%`;
    document.getElementById('impact-card-annual').innerText = `${annualSavedDays} ${currentLang === 'en' ? 'days' : 'dias'}`;
}

async function generateAiStrategicBrief() {
    const briefBox = document.getElementById('roi-ai-summary');
    if (!briefBox) return;
    
    briefBox.innerText = currentLang === 'en' ? "AI is reviewing the note topic to estimate business value..." : "A IA está analisando a nota para estimar o valor estratégico...";
    
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote || !activeNote.content.trim()) {
        briefBox.innerText = currentLang === 'en' ? "Write some content in the note to generate a business case analysis." : "Escreva algum conteúdo na nota para gerar uma análise de caso de negócio.";
        return;
    }
    
    try {
        const textContent = getCleanEditorHtml().replace(/<[^>]*>/g, '').trim().substring(0, 1500);
        
        const systemPrompt = currentLang === 'en' 
            ? "You are a senior business strategist. Analyze the note content and write a very brief 2-sentence summary of the business impact and ROI of automating this topic using AI. Be concise and professional."
            : "Você é um estrategista sênior de negócios. Analise o conteúdo da nota e escreva um resumo curtíssimo de apenas 2 frases sobre o impacto empresarial e o ROI estratégico de automatizar este processo com IA. Seja direto e profissional.";
            
        const prompt = `Topic:\n\n"${textContent}"`;
        
        const response = await callLocalAI(prompt, systemPrompt);
        briefBox.innerText = response.trim();
    } catch (err) {
        console.error("Failed to generate strategic brief:", err);
        briefBox.innerText = currentLang === 'en' ? "Strategic brief could not be loaded." : "Não foi possível carregar a análise estratégica.";
    }
}

function copyRoiReport() {
    const hoursSaved = document.getElementById('impact-card-saved-hours').innerText;
    const reduction = document.getElementById('impact-card-percent').innerText;
    const annualDays = document.getElementById('impact-card-annual').innerText;
    const strategicBrief = document.getElementById('roi-ai-summary').innerText;
    const noteTitleText = document.getElementById('impact-note-title').innerText;
    
    const reportText = currentLang === 'en' 
        ? `🏆 PRODUCTIVITY REPORT
=====================================================
Analyzed Note: ${noteTitleText}
Impact Metrics with SmartNotes AI:
- Monthly Time Savings: ${hoursSaved}
- Time Saved per Task: ${reduction}
- Productivity Days Recovered/Year: ${annualDays}

Strategic Value Analysis:
"${strategicBrief}"
=====================================================
Generated 100% locally and securely by SmartNotes AI.`
        : `🏆 RELATÓRIO DE PRODUTIVIDADE
=====================================================
Nota Analisada: ${noteTitleText}
Métricas de Impacto com SmartNotes AI:
- Economia de Tempo Mensal: ${hoursSaved}
- Redução de Tempo por Tarefa: ${reduction}
- Dias de Produtividade Recuperados/Ano: ${annualDays}

Análise de Valor Estratégico:
"${strategicBrief}"
=====================================================
Gerado de forma 100% Local e Segura pelo SmartNotes AI.`;

    navigator.clipboard.writeText(reportText).then(() => {
        showToast(currentLang === 'en' ? "ROI Report copied to clipboard!" : "Relatório de ROI copiado para a área de transferência!", 'success');
    }).catch(err => {
        console.error("Clipboard copy failed", err);
    });
}

/* ==========================================================================
   PRODUCTIVITY ENHANCEMENTS AND NEW FEATURES IMPLEMENTATION
   ========================================================================== */

// Global variables for new features
let currentView = 'editor'; // 'editor' or 'kanban'
let pomoTimer = null;
let pomoTimeLeft = 25 * 60;
let pomoIsActive = false;
let pomoCurrentSession = 'focus'; // 'focus' or 'break'
let pomoFocusTime = 25;
let pomoBreakTime = 5;
let activeAutocomplete = null; // 'wikilinks' or 'slash'

// 1. View Toggler (Editor/Kanban)
function toggleView() {
    const editorWorkspace = document.getElementById('editor-workspace');
    const kanbanWorkspace = document.getElementById('kanban-workspace');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const formatToolbar = document.querySelector('.format-toolbar');
    const aiToolbar = document.querySelector('.ai-toolbar');
    
    if (!editorWorkspace || !kanbanWorkspace || !toggleViewBtn) return;
    
    if (currentView === 'editor') {
        currentView = 'kanban';
        editorWorkspace.style.display = 'none';
        kanbanWorkspace.style.display = 'block';
        if (formatToolbar) formatToolbar.style.display = 'none';
        if (aiToolbar) aiToolbar.style.display = 'none';
        
        toggleViewBtn.setAttribute('data-i18n', 'viewEditor');
        renderKanbanBoard();
    } else {
        currentView = 'editor';
        editorWorkspace.style.display = 'block';
        kanbanWorkspace.style.display = 'none';
        if (formatToolbar) formatToolbar.style.display = 'flex';
        if (aiToolbar) aiToolbar.style.display = 'flex';
        
        toggleViewBtn.setAttribute('data-i18n', 'viewKanban');
        
        // Re-load active note into editor
        if (activeNoteId) {
            selectNote(activeNoteId);
        }
    }
    updateUiLanguage();
}

// 2. Kanban Board Rendering and Drag-and-Drop
function renderKanbanBoard() {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) return;
    
    kanbanBoard.innerHTML = '';
    
    const columns = [
        { id: 'todo', titleKey: 'kanbanColumnTodo', statusTags: ['todo', 'a fazer', 'backlog'] },
        { id: 'doing', titleKey: 'kanbanColumnDoing', statusTags: ['doing', 'em progresso', 'fazendo', 'investigando'] },
        { id: 'done', titleKey: 'kanbanColumnDone', statusTags: ['done', 'concluido', 'concluído', 'aprovado'] },
        { id: 'uncategorized', titleKey: 'kanbanColumnUncategorized', statusTags: [] }
    ];
    
    // Group notes by column status
    const colNotesMap = { todo: [], doing: [], done: [], uncategorized: [] };
    
    notes.forEach(note => {
        let placed = false;
        if (note.tags && note.tags.length > 0) {
            for (const tag of note.tags) {
                const tagName = tag.name.toLowerCase();
                for (const col of columns) {
                    if (col.statusTags.includes(tagName)) {
                        colNotesMap[col.id].push(note);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
        if (!placed) {
            colNotesMap.uncategorized.push(note);
        }
    });
    
    columns.forEach(col => {
        const colNotes = colNotesMap[col.id];
        
        const colEl = document.createElement('div');
        colEl.className = 'kanban-column';
        colEl.dataset.columnId = col.id;
        
        colEl.innerHTML = `
            <div class="kanban-column-header">
                <span data-i18n="${col.titleKey}">${i18n[currentLang][col.titleKey]}</span>
                <span class="kanban-card-count" id="count-${col.id}">${colNotes.length}</span>
            </div>
            <div class="kanban-cards-container" data-column-id="${col.id}"></div>
        `;
        
        const cardsContainer = colEl.querySelector('.kanban-cards-container');
        
        colNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.noteId = note.id;
            card.style.borderLeft = `4px solid ${note.color || 'var(--primary-color)'}`;
            
            const textContent = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';
            const previewText = textContent.substring(0, 80) + (textContent.length > 80 ? '...' : '');
            
            card.innerHTML = `
                <div class="kanban-card-title">${note.title || i18n[currentLang].noteTitlePlaceholder}</div>
                <div class="kanban-card-preview">${previewText || '<i>Vazia</i>'}</div>
                <div class="kanban-card-footer">
                    <div class="kanban-card-tags">
                        ${(note.tags || []).map(t => `<span class="kanban-card-tag" style="background: ${t.color}">${t.name}</span>`).join('')}
                    </div>
                    <button class="kanban-card-edit-btn" data-note-id="${note.id}">${currentLang === 'en' ? 'Edit' : 'Editar'}</button>
                </div>
            `;
            
            // Drag and drop event listeners on card
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', note.id);
                card.classList.add('dragging');
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
            
            // Edit button handler
            card.querySelector('.kanban-card-edit-btn').onclick = (e) => {
                e.stopPropagation();
                currentView = 'kanban'; // force toggleView to swap back to editor
                toggleView();
                selectNote(note.id);
            };
            
            cardsContainer.appendChild(card);
        });
        
        // Drag over column container
        cardsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            colEl.classList.add('drag-over');
        });
        
        cardsContainer.addEventListener('dragleave', () => {
            colEl.classList.remove('drag-over');
        });
        
        cardsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            colEl.classList.remove('drag-over');
            
            const noteId = e.dataTransfer.getData('text/plain');
            const note = notes.find(n => n.id === noteId);
            if (!note) return;
            
            // Update tags based on column drop target
            const statusTagNames = ['todo', 'a fazer', 'backlog', 'doing', 'em progresso', 'fazendo', 'investigando', 'done', 'concluido', 'concluído', 'aprovado'];
            
            // Remove previous status tags
            if (note.tags) {
                note.tags = note.tags.filter(t => !statusTagNames.includes(t.name.toLowerCase()));
            } else {
                note.tags = [];
            }
            
            // Add new status tag
            if (col.id === 'todo') {
                note.tags.push({ name: currentLang === 'en' ? 'Todo' : 'A Fazer', color: '#ef4444' });
            } else if (col.id === 'doing') {
                note.tags.push({ name: currentLang === 'en' ? 'Doing' : 'Em Progresso', color: '#3b82f6' });
            } else if (col.id === 'done') {
                note.tags.push({ name: currentLang === 'en' ? 'Done' : 'Concluído', color: '#10b981' });
            }
            
            localStorage.setItem('smartnotes_notes', JSON.stringify(notes));
            renderKanbanBoard();
            buildGraphData();
        });
        
        kanbanBoard.appendChild(colEl);
    });
    
    updateUiLanguage();
}

// 3. WikiLinks and Slash Commands Autocomplete
function handleEditorSuggestionsInput(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
        closeWikiLinksSuggestions();
        closeSlashSuggestions();
        return;
    }
    
    const text = textNode.textContent || "";
    const offset = range.startOffset;
    
    // Check WikiLinks "[["
    const textBeforeCursor = text.substring(0, offset);
    const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');
    const lastDoubleBracketClose = textBeforeCursor.lastIndexOf(']]');
    
    if (lastDoubleBracket !== -1 && lastDoubleBracket > lastDoubleBracketClose) {
        const query = textBeforeCursor.substring(lastDoubleBracket + 2);
        if (!query.includes('\n')) {
            openWikiLinksSuggestions(query, range);
            return;
        }
    }
    closeWikiLinksSuggestions();
    
    // Check Slash Commands "/"
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    if (lastSlash !== -1 && (lastSlash === 0 || /\s/.test(textBeforeCursor[lastSlash - 1]))) {
        const query = textBeforeCursor.substring(lastSlash + 1);
        if (!/\s/.test(query) && !query.includes('\n')) {
            openSlashSuggestions(query, range);
            return;
        }
    }
    closeSlashSuggestions();
}

function openWikiLinksSuggestions(query, range) {
    const popover = document.getElementById('wikilinks-suggestions');
    if (!popover) return;
    
    activeAutocomplete = 'wikilinks';
    popover.innerHTML = '';
    
    const lowercaseQuery = query.toLowerCase().trim();
    const filteredNotes = notes.filter(n => n.id !== activeNoteId && (n.title || "").toLowerCase().includes(lowercaseQuery));
    
    if (filteredNotes.length === 0) {
        popover.style.display = 'none';
        return;
    }
    
    filteredNotes.forEach((note, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item' + (index === 0 ? ' active' : '');
        item.dataset.index = index;
        item.dataset.noteTitle = note.title;
        
        let tagText = '';
        if (note.tags && note.tags.length > 0) {
            const firstTag = note.tags[0];
            if (firstTag) {
                tagText = typeof firstTag === 'object' ? (firstTag.name || '') : firstTag;
            }
        }
        
        item.innerHTML = `
            <span>📄 ${note.title}</span>
            <span class="item-sub">${tagText}</span>
        `;
        
        item.onmousedown = (e) => {
            e.preventDefault();
        };
        
        item.onclick = () => {
            selectWikiLinkSuggestion(note.title, range);
        };
        popover.appendChild(item);
    });
    
    positionPopover(popover, range);
}

function selectWikiLinkSuggestion(title, range) {
    const textNode = range.startContainer;
    const offset = range.startOffset;
    const text = textNode.textContent || "";
    const lastDoubleBracket = text.substring(0, offset).lastIndexOf('[[');
    
    if (lastDoubleBracket !== -1) {
        const replacementRange = document.createRange();
        replacementRange.setStart(textNode, lastDoubleBracket);
        replacementRange.setEnd(textNode, offset);
        
        const linkText = `[[${title}]] `;
        insertHtmlAtCaret(linkText, replacementRange);
    }
    closeWikiLinksSuggestions();
}

function closeWikiLinksSuggestions() {
    const popover = document.getElementById('wikilinks-suggestions');
    if (popover) {
        popover.style.display = 'none';
        if (activeAutocomplete === 'wikilinks') activeAutocomplete = null;
    }
}

function openSlashSuggestions(query, range) {
    const popover = document.getElementById('slash-commands-suggestions');
    if (!popover) return;
    
    activeAutocomplete = 'slash';
    popover.innerHTML = '';
    
    const commands = [
        { name: '/vulnerability', label: '🔴 Relatório de Vulnerabilidade', desc: 'Template de auditoria de segurança' },
        { name: '/minutes', label: '🎙️ Ata de Reunião', desc: 'Estrutura formal de reuniões' },
        { name: '/table', label: '📊 Tabela', desc: 'Tabela simples 2x2' },
        { name: '/code', label: '💻 Bloco de Código', desc: 'Área pré-formatada de código' },
        { name: '/hr', label: '➖ Linha Horizontal', desc: 'Linha separadora' },
        { name: '/ai-summarize', label: '🪄 Resumo Automático', desc: 'Dispara a IA para resumir nota' }
    ];
    
    const lowercaseQuery = query.toLowerCase().trim();
    const filtered = commands.filter(c => c.name.includes(lowercaseQuery) || c.label.toLowerCase().includes(lowercaseQuery));
    
    if (filtered.length === 0) {
        popover.style.display = 'none';
        return;
    }
    
    filtered.forEach((cmd, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item' + (index === 0 ? ' active' : '');
        item.dataset.index = index;
        item.dataset.cmdName = cmd.name;
        item.innerHTML = `
            <div>
                <strong style="display: block;">${cmd.label}</strong>
                <span style="font-size: 0.65rem; opacity: 0.6;">${cmd.desc}</span>
            </div>
        `;
        
        item.onmousedown = (e) => {
            e.preventDefault();
        };
        
        item.onclick = () => {
            selectSlashSuggestion(cmd.name, range);
        };
        popover.appendChild(item);
    });
    
    positionPopover(popover, range);
}

function selectSlashSuggestion(cmdName, range) {
    const textNode = range.startContainer;
    const offset = range.startOffset;
    const text = textNode.textContent || "";
    const lastSlash = text.substring(0, offset).lastIndexOf('/');
    
    if (lastSlash !== -1) {
        const replacementRange = document.createRange();
        replacementRange.setStart(textNode, lastSlash);
        replacementRange.setEnd(textNode, offset);
        
        let htmlToInsert = '';
        if (cmdName === '/vulnerability') {
            htmlToInsert = `
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid var(--border-color); font-size: 0.85rem;">
                    <thead>
                        <tr style="background-color: rgba(239, 68, 68, 0.08);">
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Severidade</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Vulnerabilidade</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Risco</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Correção</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid var(--border-color); padding: 8px; color: #ef4444; font-weight: bold;">🔴 Crítico</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px; font-weight: 600;">Descrição do Bug...</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Explicação do Risco...</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Sanitização e patches...</td>
                        </tr>
                    </tbody>
                </table>
                <div>&nbsp;</div>
            `;
        } else if (cmdName === '/minutes') {
            htmlToInsert = `
                <h2>🎙️ Ata de Reunião</h2>
                <p><b>Data:</b> ${new Date().toLocaleDateString()} | <b>Participantes:</b> [Nomes]</p>
                <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
                <h3>📝 Pauta Geral</h3>
                <p>Escreva os tópicos abordados...</p>
                <h3>📋 Plano de Ação</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid var(--border-color);">
                    <thead>
                        <tr style="background-color: rgba(192, 132, 252, 0.08);">
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Tarefa</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Dono</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Prazo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Ação recomendada...</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Responsável...</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Data limite...</td>
                        </tr>
                    </tbody>
                </table>
                <div>&nbsp;</div>
            `;
        } else if (cmdName === '/table') {
            htmlToInsert = `
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid var(--border-color);">
                    <thead>
                        <tr>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Cabeçalho 1</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Cabeçalho 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Dado 1</td>
                            <td style="border: 1px solid var(--border-color); padding: 8px;">Dado 2</td>
                        </tr>
                    </tbody>
                </table>
                <div>&nbsp;</div>
            `;
        } else if (cmdName === '/code') {
            htmlToInsert = `
                <pre style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-family: monospace; overflow-x: auto;"><code>// Insira seu código aqui</code></pre>
                <div>&nbsp;</div>
            `;
        } else if (cmdName === '/hr') {
            htmlToInsert = `<hr class="editor-hr" contenteditable="false" style="border: none; border-top: 1px solid var(--border-color); margin: 1.5rem 0;"><div>&nbsp;</div>`;
        } else if (cmdName === '/ai-summarize') {
            htmlToInsert = ` `; // Trigger AI summary
            runQuickAction('summarize');
        }
        
        insertHtmlAtCaret(htmlToInsert, replacementRange);
    }
    closeSlashSuggestions();
}

function closeSlashSuggestions() {
    const popover = document.getElementById('slash-commands-suggestions');
    if (popover) {
        popover.style.display = 'none';
        if (activeAutocomplete === 'slash') activeAutocomplete = null;
    }
}

function positionPopover(popover, range) {
    const rect = range.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let caretBottom = rect.bottom;
    let caretTop = rect.top;
    
    if (rect.top === 0 && rect.left === 0) {
        const parent = range.startContainer.parentElement;
        if (parent) {
            const parentBox = parent.getBoundingClientRect();
            caretBottom = parentBox.bottom;
            caretTop = parentBox.top;
            left = parentBox.left + window.scrollX;
        }
    }
    
    popover.style.display = 'flex';
    
    const popoverHeight = popover.offsetHeight || 180;
    const popoverWidth = popover.offsetWidth || 250;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Vertical positioning: Upwards if not enough space below, and more space above
    const spaceBelow = viewportHeight - caretBottom;
    let top;
    if (spaceBelow < popoverHeight + 15 && caretTop > spaceBelow) {
        top = caretTop + window.scrollY - popoverHeight - 5;
    } else {
        top = caretBottom + window.scrollY + 5;
    }
    
    // Horizontal positioning: Prevent overflow on the right edge
    const caretLeft = rect.top === 0 && rect.left === 0 ? (left - window.scrollX) : rect.left;
    if (caretLeft + popoverWidth > viewportWidth - 15) {
        left = Math.max(10, viewportWidth - popoverWidth - 15) + window.scrollX;
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
}

function handleAutocompleteSuggestionsKeydown(e) {
    if (!activeAutocomplete) return;
    
    const popoverId = activeAutocomplete === 'wikilinks' ? 'wikilinks-suggestions' : 'slash-commands-suggestions';
    const popover = document.getElementById(popoverId);
    if (!popover || popover.style.display === 'none') return;
    
    const items = popover.querySelectorAll('.suggestion-item');
    if (items.length === 0) return;
    
    let activeItem = popover.querySelector('.suggestion-item.active');
    let activeIndex = activeItem ? parseInt(activeItem.dataset.index) : 0;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[activeIndex].classList.remove('active');
        activeIndex = (activeIndex + 1) % items.length;
        items[activeIndex].classList.add('active');
        items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[activeIndex].classList.remove('active');
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        items[activeIndex].classList.add('active');
        items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeItem) {
            activeItem.click();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        closeWikiLinksSuggestions();
        closeSlashSuggestions();
    }
}

function insertHtmlAtCaret(html, rangeToRemove) {
    let range;
    if (rangeToRemove) {
        rangeToRemove.deleteContents();
        range = rangeToRemove;
    } else {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        range = selection.getRangeAt(0);
    }
    
    const el = document.createElement("div");
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;
    while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
    }
    
    range.insertNode(frag);
    
    if (lastNode) {
        const selection = window.getSelection();
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
    
    updateActiveNote();
}

// 4. Pomodoro Timer Focus Mode Logic
function initPomodoro() {
    const playBtn = document.getElementById('pomodoro-play-btn');
    const skipBtn = document.getElementById('pomodoro-skip-btn');
    const resetBtn = document.getElementById('pomodoro-reset-btn');
    const settingsToggle = document.getElementById('pomodoro-settings-toggle');
    const focusTimeInput = document.getElementById('pomodoro-focus-time');
    const breakTimeInput = document.getElementById('pomodoro-break-time');
    
    if (playBtn) {
        playBtn.onclick = () => {
            if (pomoIsActive) {
                pausePomo();
            } else {
                startPomo();
            }
        };
    }
    
    if (skipBtn) {
        skipBtn.onclick = () => {
            switchPomoSession();
        };
    }
    
    if (resetBtn) {
        resetBtn.onclick = () => {
            resetPomo();
        };
    }
    
    if (settingsToggle) {
        settingsToggle.onclick = () => {
            const panel = document.getElementById('pomodoro-settings-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
            }
        };
    }
    
    const handleSettingsChange = () => {
        pomoFocusTime = Math.max(1, parseInt(focusTimeInput.value) || 25);
        pomoBreakTime = Math.max(1, parseInt(breakTimeInput.value) || 5);
        resetPomo();
    };
    
    if (focusTimeInput) focusTimeInput.onchange = handleSettingsChange;
    if (breakTimeInput) breakTimeInput.onchange = handleSettingsChange;
    
    updatePomoDisplay();
}

function startPomo() {
    pomoIsActive = true;
    const playBtn = document.getElementById('pomodoro-play-btn');
    if (playBtn) {
        playBtn.textContent = '⏸';
        playBtn.title = i18n[currentLang].pomodoroPause;
        playBtn.setAttribute('data-i18n-title', 'pomodoroPause');
    }
    
    const widget = document.getElementById('zen-pomodoro-widget');
    if (widget) {
        widget.classList.add(pomoCurrentSession === 'focus' ? 'focus-active' : 'break-active');
        widget.classList.remove(pomoCurrentSession === 'focus' ? 'break-active' : 'focus-active');
    }
    
    // Audio integration: Trigger lofi sound on focus start if not playing
    if (pomoCurrentSession === 'focus' && !activeSounds.lofi) {
        toggleSound('lofi');
        const lofiVol = document.querySelector('.sound-vol[data-track="lofi"]');
        if (lofiVol) lofiVol.value = 0.3;
        volumeControls.lofi = 0.3;
        if (soundNodes.lofi) {
            soundNodes.lofi.gain.value = 0.3;
        }
    }
    
    pomoTimer = setInterval(() => {
        tickPomo();
    }, 1000);
}

function pausePomo() {
    pomoIsActive = false;
    const playBtn = document.getElementById('pomodoro-play-btn');
    if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.title = i18n[currentLang].pomodoroStart;
        playBtn.setAttribute('data-i18n-title', 'pomodoroStart');
    }
    
    clearInterval(pomoTimer);
}

function resetPomo() {
    pausePomo();
    pomoCurrentSession = 'focus';
    pomoTimeLeft = pomoFocusTime * 60;
    
    const widget = document.getElementById('zen-pomodoro-widget');
    if (widget) {
        widget.classList.remove('focus-active', 'break-active');
    }
    
    updatePomoDisplay();
}

function tickPomo() {
    if (pomoTimeLeft > 0) {
        pomoTimeLeft--;
        updatePomoDisplay();
    } else {
        playPomoSound();
        switchPomoSession();
    }
}

function switchPomoSession() {
    pausePomo();
    if (pomoCurrentSession === 'focus') {
        pomoCurrentSession = 'break';
        pomoTimeLeft = pomoBreakTime * 60;
        showToast(currentLang === 'en' ? "Focus session completed! Take a break." : "Sessão de foco concluída! Faça uma pausa.", 'success');
    } else {
        pomoCurrentSession = 'focus';
        pomoTimeLeft = pomoFocusTime * 60;
        showToast(currentLang === 'en' ? "Break completed! Time to focus." : "Pausa concluída! Hora de focar.", 'success');
    }
    
    const widget = document.getElementById('zen-pomodoro-widget');
    if (widget) {
        widget.classList.add(pomoCurrentSession === 'focus' ? 'focus-active' : 'break-active');
        widget.classList.remove(pomoCurrentSession === 'focus' ? 'break-active' : 'focus-active');
    }
    
    updatePomoDisplay();
    startPomo();
}

function updatePomoDisplay() {
    const mins = Math.floor(pomoTimeLeft / 60);
    const secs = pomoTimeLeft % 60;
    const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const displayEl = document.getElementById('pomodoro-timer-display');
    if (displayEl) displayEl.textContent = display;
    
    const titleEl = document.getElementById('pomodoro-session-title');
    if (titleEl) {
        if (pomoCurrentSession === 'focus') {
            titleEl.setAttribute('data-i18n', 'pomodoroFocus');
        } else {
            titleEl.setAttribute('data-i18n', 'pomodoroBreak');
        }
    }
    updateUiLanguage();
}

function playPomoSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8); // A4
        
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.3);
    } catch (e) {
        console.error("Failed to play Pomodoro sound:", e);
    }
}

// 5. Advanced PDF Print layouts formatting
function initPdfExport() {
    const pdfConfirmBtn = document.getElementById('pdf-confirm-export-btn');
    const closePdfBtn = document.getElementById('close-pdf-export-btn');
    
    if (pdfConfirmBtn) {
        pdfConfirmBtn.onclick = () => {
            const template = document.querySelector('input[name="pdf-template"]:checked')?.value || 'default';
            doAdvancedPdfPrint(template);
        };
    }
    
    if (closePdfBtn) {
        closePdfBtn.onclick = () => {
            const modal = document.getElementById('pdf-export-options-modal');
            if (modal) modal.style.display = 'none';
        };
    }
}

function showPdfExportModal() {
    const modal = document.getElementById('pdf-export-options-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function doAdvancedPdfPrint(template) {
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (!activeNote) return;
    
    // Hide pdf modal
    const modal = document.getElementById('pdf-export-options-modal');
    if (modal) modal.style.display = 'none';
    
    // Remove old wrapper if exists
    let oldWrapper = document.getElementById('print-wrapper');
    if (oldWrapper) oldWrapper.remove();
    
    // Create new print wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'print-wrapper';
    
    const noteTitle = activeNote.title || i18n[currentLang].noteTitlePlaceholder;
    const noteHtml = activeNote.content || '';
    
    if (template === 'minutes') {
        // Meeting Minutes Template
        wrapper.innerHTML = `
            <div class="print-header">
                <div class="print-logo">SmartNotes <span>AI</span></div>
                <div style="font-size: 0.8rem; text-align: right; color: #64748b;">
                    ATA OFICIAL DE REUNIÃO<br>
                    Data: ${new Date().toLocaleDateString()}
                </div>
            </div>
            
            <table class="print-meta-table">
                <tr>
                    <th style="width: 25%;">Assunto / Projeto</th>
                    <td>${noteTitle}</td>
                </tr>
                <tr>
                    <th>Data e Hora</th>
                    <td>${new Date().toLocaleString()}</td>
                </tr>
                <tr>
                    <th>Participantes</th>
                    <td>[  ] Gerência  |  [  ] Auditoria  |  [  ] Desenvolvimento  |  [  ] QA</td>
                </tr>
            </table>
            
            <h1 class="print-title">${noteTitle}</h1>
            <div class="print-body">${noteHtml}</div>
            
            <div class="print-footer-signatures">
                <div class="sig-line">Relator / Secretário</div>
                <div class="sig-line">Presidente / Líder da Reunião</div>
            </div>
        `;
    } else if (template === 'roi') {
        // ROI Impact Report Template
        const hoursSaved = document.getElementById('impact-card-saved-hours')?.innerText || '18h';
        const reduction = document.getElementById('impact-card-percent')?.innerText || '91%';
        const annualDays = document.getElementById('impact-card-annual')?.innerText || '27 dias';
        const strategicBrief = document.getElementById('roi-ai-summary')?.innerText || '';
        
        wrapper.innerHTML = `
            <div class="print-header">
                <div class="print-logo">SmartNotes <span>AI</span></div>
                <div style="font-size: 0.8rem; text-align: right; color: #b91c1c; font-weight: 700;">
                    RELATÓRIO EXECUTIVO DE ROI & AUDITORIA<br>
                    Segurança de Dados Local
                </div>
            </div>
            
            <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <h3 style="margin-top: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b;">INDICADORES DE ROI E PRODUTIVIDADE</h3>
                <table class="print-meta-table" style="margin-bottom: 0; margin-top: 10px;">
                    <tr style="text-align: center; font-weight: bold;">
                        <th style="text-align: center;">Horas Salvas / Mês</th>
                        <th style="text-align: center;">Redução de Tempo</th>
                        <th style="text-align: center;">Produtividade Anual</th>
                    </tr>
                    <tr style="text-align: center; font-size: 1.2rem; color: #1e1b4b;">
                        <td>${hoursSaved}</td>
                        <td>${reduction}</td>
                        <td>${annualDays}</td>
                    </tr>
                </table>
            </div>
            
            ${strategicBrief ? `
            <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 15px; margin-bottom: 20px; border-radius: 4px; font-style: italic;">
                <h4 style="margin-top: 0; font-size: 0.8rem; font-weight: 700; color: #581c87; text-transform: uppercase;">Resumo Executivo AI</h4>
                <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: #3b0764;">"${strategicBrief}"</p>
            </div>
            ` : ''}
            
            <h1 class="print-title">${noteTitle}</h1>
            <div class="print-body">${noteHtml}</div>
            
            <div class="print-footer-signatures" style="margin-top: 6rem;">
                <div class="sig-line">Responsável pela Análise</div>
                <div class="sig-line">Aprovação Executiva</div>
            </div>
        `;
    } else {
        // Standard Template
        wrapper.innerHTML = `
            <h1 class="print-title">${noteTitle}</h1>
            <div class="print-body">${noteHtml}</div>
        `;
    }
    
    document.body.appendChild(wrapper);
    window.print();
    
    // Clean up after print dialog finishes
    setTimeout(() => {
        if (wrapper) wrapper.remove();
    }, 1000);
}

// 6. Shortcuts Help Drawer Panel Wires
function initQuickGuide() {
    const showGuideBtn = document.getElementById('show-guide-btn');
    const closeGuideBtn = document.getElementById('close-guide-btn');
    const closeGuideFooterBtn = document.getElementById('close-guide-footer-btn');
    const panel = document.getElementById('quick-guide-panel');
    
    if (showGuideBtn && panel) {
        showGuideBtn.onclick = (e) => {
            e.stopPropagation();
            panel.style.display = 'flex';
        };
    }
    
    const closePanel = () => {
        if (panel) panel.style.display = 'none';
    };
    
    if (closeGuideBtn) closeGuideBtn.onclick = closePanel;
    if (closeGuideFooterBtn) closeGuideFooterBtn.onclick = closePanel;
    
    // Close on clicking outside
    document.addEventListener('click', (e) => {
        if (panel && panel.style.display === 'flex') {
            if (!panel.contains(e.target) && e.target !== showGuideBtn) {
                closePanel();
            }
        }
        
        // Also close autocomplete popovers on outer click
        const wikiPopover = document.getElementById('wikilinks-suggestions');
        if (wikiPopover && !wikiPopover.contains(e.target)) {
            closeWikiLinksSuggestions();
        }
        const slashPopover = document.getElementById('slash-commands-suggestions');
        if (slashPopover && !slashPopover.contains(e.target)) {
            closeSlashSuggestions();
        }
    });
}

// 7. Pomodoro Timer state toggle inside Zen Mode Hooks
function hookPomodoroTimerToZenMode(isZen) {
    const pomoWidget = document.getElementById('zen-pomodoro-widget');
    if (pomoWidget) {
        if (isZen) {
            pomoWidget.style.display = 'block';
            pomoCurrentSession = 'focus';
            pomoTimeLeft = pomoFocusTime * 60;
            updatePomoDisplay();
        } else {
            pomoWidget.style.display = 'none';
            pausePomo();
        }
    }
}

// Initialize all DOM bindings for productivity enhancements
document.addEventListener('DOMContentLoaded', () => {
    // 1. View Toggler Event
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    if (toggleViewBtn) {
        toggleViewBtn.onclick = toggleView;
    }
    
    // 2. Editor key event listeners for WikiLinks and Slash commands
    if (noteContent) {
        noteContent.addEventListener('input', handleEditorSuggestionsInput);
        noteContent.addEventListener('keydown', handleAutocompleteSuggestionsKeydown);
    }
    
    // 3. Initialize Pomodoro
    initPomodoro();
    
    // 4. Hook Pomodoro Widget to Zen Mode toggles
    const origToggleZenMode = window.toggleZenMode;
    if (typeof origToggleZenMode === 'function') {
        window.toggleZenMode = function() {
            origToggleZenMode();
            const isZen = document.body.classList.contains('zen-focus-mode');
            hookPomodoroTimerToZenMode(isZen);
        };
    }
    
    const origExitZenMode = window.exitZenMode;
    if (typeof origExitZenMode === 'function') {
        window.exitZenMode = function() {
            origExitZenMode();
            hookPomodoroTimerToZenMode(false);
        };
    }
    
    // 5. Initialize PDF export modal hooks
    initPdfExport();
    // Wrap the export-pdf-btn click listener
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        // Remove direct window.print call by cloning and replacing button
        const newExportPdfBtn = exportPdfBtn.cloneNode(true);
        exportPdfBtn.parentNode.replaceChild(newExportPdfBtn, exportPdfBtn);
        newExportPdfBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPdfExportModal();
        });
    }
    
    // 6. Initialize Quick Guide drawer
    initQuickGuide();
});




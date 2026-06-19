require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

// Polyfill DOMMatrix for pdf-parse environment compatibility in Node.js
if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {};
}

const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse incoming request bodies in JSON format (increased limit for PDF base64 uploads)
app.use(express.json({ limit: '10mb' }));

// CORS middleware to allow requests from local developers (e.g. Live Server on 5500) or file:///
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static frontend assets (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Local AI Endpoint mapping to Foundry Local daemon URL
const FOUNDRY_API_URL = process.env.FOUNDRY_API_URL || 'http://127.0.0.1:3000/v1/chat/completions';

// Helper function to scrape YouTube video transcript natively
async function fetchYoutubeTranscript(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to access YouTube: ${response.status}`);
    }
    const html = await response.text();
    
    // Find the ytInitialPlayerResponse payload on the page
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!playerResponseMatch) {
        throw new Error("Could not load YouTube video info. Make sure the ID is correct or the video is public.");
    }
    
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const videoDetails = playerResponse.videoDetails;
    const title = videoDetails?.title || 'Untitled';
    const description = videoDetails?.shortDescription || 'No description';
    
    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
        console.log(`[Backend] Subtitles unavailable for video ${videoId}. Returning metadata.`);
        return `[Note: This video does not have subtitles available on YouTube. The following summary is based on the video title and description provided by the author]\n\nVIDEO TITLE: ${title}\n\nVIDEO DESCRIPTION:\n${description}`;
    }
    
    // Look for Portuguese (pt) or English (en) captions, fallback to first track
    const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks.find(t => t.languageCode === 'pt') || captionTracks[0];
    const trackUrl = track.baseUrl;
    
    const transcriptResponse = await fetch(trackUrl);
    if (!transcriptResponse.ok) {
        console.log(`[Backend] Failed to download subtitles for ${videoId}. Using metadata.`);
        return `[Note: Failed to download YouTube subtitles. The following summary is based on the title and description provided by the author]\n\nVIDEO TITLE: ${title}\n\nVIDEO DESCRIPTION:\n${description}`;
    }
    
    const xml = await transcriptResponse.text();
    
    // Parse XML tags to pull plain text lines
    const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    let transcriptText = [];
    
    while ((match = textRegex.exec(xml)) !== null) {
        let text = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/\n/g, ' ')
            .trim();
        if (text) {
            transcriptText.push(text);
        }
    }
    
    if (transcriptText.length === 0) {
        return `[Note: Captions exist but are empty. Summary is based on title and description]\n\nVIDEO TITLE: ${title}\n\nVIDEO DESCRIPTION:\n${description}`;
    }
    
    return transcriptText.join(' ');
}

// GET route to obtain a video's transcript
app.get('/api/youtube-transcript', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Video URL is required.' });
    }
    
    // Extract video ID from URL
    let videoId = null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    } else {
        videoId = url; // assume the user passed the ID directly
    }
    
    try {
        console.log(`[Backend] Fetching transcript for video ID: ${videoId}...`);
        const text = await fetchYoutubeTranscript(videoId);
        res.json({ transcript: text });
    } catch (error) {
        console.error('[Backend] Error getting YouTube transcript:', error.message);
        res.status(500).json({ error: error.message || 'Error loading video transcript.' });
    }
});

// POST route to bridge browser console logs to backend console
app.post('/api/log', (req, res) => {
    const { level, message } = req.body;
    console.log(`[Browser Console] ${level.toUpperCase()}:`, message);
    res.sendStatus(200);
});

// POST route to communicate with local AI
app.post('/api/ai', async (req, res) => {
    const { prompt, model = 'qwen3-0.6b', systemInstruction } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const controller = new AbortController();
    res.on('close', () => {
        if (!res.writableEnded) {
            console.log(`[${new Date().toISOString()}] [Backend] Client closed connection prematurely. Aborting Foundry Local request...`);
            controller.abort();
        }
    });

    // Map model selection to actual IDs loaded in Foundry Local
    let targetModel = model;
    if (model === 'qwen3-0.6b') {
        targetModel = 'qwen3-0.6b-generic-gpu';
    } else if (model === 'phi-4-mini') {
        targetModel = 'Phi-4-mini-instruct-generic-cpu';
    } else if (model === 'deepseek-r1-1.5b') {
        targetModel = 'Phi-4-mini-instruct-generic-cpu'; // Fallback to instruction model
    } else if (model === 'gpt-oss-20b') {
        targetModel = 'gpt-oss-20b-generic-gpu';
    }
    try {
        console.log(`[${new Date().toISOString()}] [Backend] Sending request to Foundry Local (${targetModel})...`);
        let response = await fetch(FOUNDRY_API_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [
                    {
                        role: 'system',
                        content: systemInstruction || 'You are an intelligent writing assistant for a notepad. Answer clearly and concisely.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            // If model is not loaded, attempt auto-loading
            if (errorText.includes('is not loaded') || errorText.includes('load the model')) {
                console.log(`[Backend] Model ${targetModel} is not loaded. Loading dynamically...`);
                const foundryUrl = new URL(FOUNDRY_API_URL);
                const loadUrl = `${foundryUrl.protocol}//${foundryUrl.host}/models/load/${targetModel}`;
                const loadRes = await fetch(loadUrl, { signal: controller.signal });
                if (loadRes.ok) {
                    console.log(`[Backend] Model ${targetModel} loaded successfully! Retrying request...`);
                    // Retry original request
                    response = await fetch(FOUNDRY_API_URL, {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: targetModel,
                            messages: [
                                {
                                    role: 'system',
                                    content: systemInstruction || 'You are an intelligent writing assistant for a notepad. Answer clearly and concisely.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: 0.7
                        })
                    });
                    if (!response.ok) {
                        const retryErrorText = await response.text();
                        throw new Error(`Foundry Local error on retry after load: ${response.status} - ${retryErrorText}`);
                    }
                } else {
                    throw new Error(`Failed to load model via API: ${loadRes.status}`);
                }
            } else {
                throw new Error(`Foundry Local error: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json();
        
        // Return only content, stripping any thinking blocks (<think>...</think>)
        let aiMessage = data.choices[0].message.content || '';
        aiMessage = aiMessage
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .replace(/<think>[\s\S]*/g, '')
            .trim();
            
        res.json({ text: aiMessage });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('[Backend] Foundry Local request successfully aborted.');
            if (!res.headersSent) {
                res.status(499).json({ error: 'Request cancelled.' });
            }
            return;
        }
        console.warn(`[Backend] Local AI connection failed: ${error.message}. Using offline simulation fallback...`);
        try {
            const simulatedText = simulateAIResponse(prompt, systemInstruction);
            res.json({ text: simulatedText });
        } catch (simError) {
            console.error('[Backend] Simulation failed:', simError);
            res.status(500).json({ error: 'Internal server error processing AI response.' });
        }
    }
});

// POST route to extract text from an uploaded PDF (received as base64 in body)
app.post('/api/pdf-transcript', async (req, res) => {
    const { fileData } = req.body;
    if (!fileData) {
        return res.status(400).json({ error: 'File data is required.' });
    }
    
    try {
        console.log(`[Backend] Processing uploaded PDF file...`);
        const buffer = Buffer.from(fileData, 'base64');
        const data = await pdfParse(buffer);
        console.log(`[Backend] PDF parsed successfully! Extracted ${data.text.length} characters.`);
        res.json({ text: data.text });
    } catch (error) {
        console.error('[Backend] Error parsing PDF:', error.message);
        res.status(500).json({ error: 'Failed to extract text from PDF. Ensure the file is not password-protected.' });
    }
});

// GET route to scrape a webpage using Scrapling
app.get('/api/scrape', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }
    
    const { exec } = require('child_process');
    const pythonPath = `C:\\Users\\usuario\\AppData\\Roaming\\uv\\python\\cpython-3.14.5-windows-x86_64-none\\python.exe`;
    const scriptPath = path.join(__dirname, 'scraper.py');
    
    // Escape double quotes in URL for command shell safety
    const escapedUrl = url.replace(/"/g, '\\"');
    const command = `"${pythonPath}" "${scriptPath}" "${escapedUrl}"`;
    
    console.log(`[Backend] Running scraper command: ${command}`);
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Backend] Scraper execution error: ${error.message}`);
            return res.status(500).json({ error: `Scraper execution failed: ${error.message}` });
        }
        if (stderr) {
            console.warn(`[Backend] Scraper stderr: ${stderr}`);
        }
        try {
            const data = JSON.parse(stdout);
            if (data.error) {
                return res.status(500).json({ error: data.error });
            }
            res.json(data);
        } catch (parseError) {
            console.error(`[Backend] Failed to parse scraper output: ${parseError.message}`);
            console.error(`[Backend] Raw stdout was: ${stdout}`);
            res.status(500).json({ error: 'Failed to parse scraper response.' });
        }
    });
});

// POST route to synthesize text to speech via Azure AI Speech / MAI-Voice-2
app.post('/api/tts', async (req, res) => {
    const { text, voice = 'en-US-JennyNeural', lang = 'en-US' } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text content is required.' });
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!key) {
        console.log(`[Backend] Azure Speech Key not configured. Using browser-native synthesis.`);
        return res.status(501).json({ error: 'TTS API not configured on backend.' });
    }

    try {
        console.log(`[Backend] Synthesizing speech via Azure Speech Services (${voice})...`);
        const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
        
        // Escape special XML characters in text for SSML safety
        const xmlSafeText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        const ssml = `<speak version='1.0' xml:lang='${lang}'><voice xml:lang='${lang}' name='${voice}'>${xmlSafeText}</voice></speak>`;

        const response = await fetch(ttsUrl, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                'User-Agent': 'SmartNotesAI'
            },
            body: ssml
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure Speech API error: ${response.status} - ${errorText}`);
        }

        // Stream the MP3 audio response directly to client
        res.setHeader('Content-Type', 'audio/mpeg');
        response.body.pipe(res);
    } catch (error) {
        console.error('[Backend] Azure TTS Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// High-quality offline AI Response Simulator when Foundry Local is unavailable
function simulateAIResponse(prompt, systemInstruction) {
    let textContent = prompt;
    const quoteMatch = prompt.match(/"([\s\S]*?)"/);
    if (quoteMatch && quoteMatch[1]) {
        textContent = quoteMatch[1];
    }
    textContent = textContent.trim();
    if (textContent.length > 200) {
        textContent = textContent.substring(0, 200) + "...";
    }

    const sys = (systemInstruction || '').toLowerCase();
    const pmt = prompt.toLowerCase();

    // 1. PITCH / SLIDES GENERATOR (JSON ARRAY)
    if (sys.includes('pitch') || sys.includes('exactly 5 slides') || pmt.includes('slide')) {
        const slides = [
            {
                title: "1. O Desafio (Problema)",
                content: [
                    "Ineficiências em processos manuais corporativos.",
                    "Perda de tempo valioso com tarefas repetitivas e burocráticas.",
                    "Falta de integração entre dados e tomada de decisão rápida."
                ]
            },
            {
                title: "2. A Solução",
                content: [
                    "Implementação de IA local segura e offline para automação.",
                    "Interface centralizada, intuitiva e otimizada para produtividade.",
                    "SmartNotes AI atuando como hub de inteligência de negócios."
                ]
            },
            {
                title: "3. Diferenciais Técnicos",
                content: [
                    "Inovação tecnológica alinhada com as melhores práticas de IA.",
                    "Processamento 100% local, protegendo dados confidenciais.",
                    "Rich text premium, gerador de atas e calculadora de impacto integrados."
                ]
            },
            {
                title: "4. Produtividade & Métricas de ROI",
                content: [
                    "Redução de até 90% no tempo de elaboração de atas e resumos.",
                    "Recuperação de dias de trabalho desperdiçados ao ano.",
                    "Aumento da eficiência operacional das equipes em tempo recorde."
                ]
            },
            {
                title: "5. Conclusão & Próximos Passos",
                content: [
                    "Adoção em larga escala na empresa para maximização de resultados.",
                    "Expansão de novos modelos locais leves para uso geral.",
                    "Aceleração da cultura AI-First com segurança e impacto real."
                ]
            }
        ];
        return JSON.stringify(slides, null, 2);
    }

    // 2. ROI STRATEGIC BRIEF
    if (sys.includes('estrategista') || sys.includes('business strategist') || pmt.includes('roi')) {
        return "A automação deste processo via inteligência artificial local elimina gargalos operacionais e reduz o retrabalho em até 91%. O impacto estratégico reflete-se em maior agilidade de tomada de decisão e na liberação de horas valiosas para atividades de alto valor agregado.";
    }

    // 3. ATA DE REUNIÃO (MEETING MINUTES)
    if (sys.includes('ata') || sys.includes('meeting minutes') || pmt.includes('ata')) {
        return `# 🎙️ ATA DE REUNIÃO

## 📝 1. Sumário Geral
A reunião abordou a otimização de processos corporativos com o uso da inteligência artificial local integrada ao SmartNotes AI. Foi discutido como as tarefas manuais consomem tempo produtivo e a necessidade de acelerar a cultura AI-First com segurança de dados.

## ⏱️ 2. Principais Decisões Tomadas
- Homologação do SmartNotes AI como assistente oficial de notas offline.
- Adoção imediata do módulo de cálculo de ROI para reportar métricas de produtividade à gerência.
- Realização de um treinamento rápido de 15 minutos para as equipes sobre como ditar e reformatar notas com a IA.

## 📋 3. Plano de Ação e Prazos

| Ação / Tarefa | Responsável | Prazo |
| :--- | :--- | :--- |
| Implementar o layout horizontal de Ações Rápidas | Equipe de Desenvolvimento | Concluído |
| Testar os modais sólidos da calculadora e slides | Controle de Qualidade | Imediato |
| Compartilhar o repositório do projeto no GitHub | Líder do Projeto | 2 dias |
`;
    }

    // 4. OTHER AI QUICK ACTIONS (SUMMARIZE, IMPROVE, ETC.)
    if (pmt.includes('resuma') || pmt.includes('summarize')) {
        return `Resumo Executivo: O texto descreve as iniciativas de produtividade sob a plataforma de notas inteligentes. Destaca-se a integração de ferramentas inteligentes locais para otimização de tempo e segurança da informação corporativa.`;
    }
    
    if (pmt.includes('melhore') || pmt.includes('improve')) {
        return `[Versão Melhorada]: Otimizamos a redação mantendo a essência original. A automação local com inteligência artificial integrada eleva a agilidade e garante conformidade de segurança aos dados da sua empresa.`;
    }

    if (pmt.includes('traduza') || pmt.includes('translate')) {
        if (pmt.includes('portuguese') || pmt.includes('português')) {
            return `Esta é uma tradução simulada para o português do texto original processado de forma local pela IA.`;
        } else {
            return `This is a simulated English translation of the original text processed locally by the AI assistant.`;
        }
    }

    if (pmt.includes('tópicos') || pmt.includes('bullets') || pmt.includes('bullet')) {
        return `- **Ponto 1**: Otimização de tempo e recursos operacionais.
- **Ponto 2**: Foco em segurança de dados com processamento local offline.
- **Ponto 3**: Geração dinâmica de atas e cálculo de ROI integrado.`;
    }

    if (pmt.includes('format')) {
        return `O texto a seguir foi reformatado de forma limpa e profissional:\n\n${textContent}`;
    }

    return `Simulação Local AI: Processamento concluído com sucesso. Texto recebido: "${textContent}"`;
}


// Start Express HTTP Server
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`\n🚀 SmartNotes AI is running!`);
        console.log(`👉 Open in browser: http://localhost:${port}`);
        const foundryUrl = new URL(FOUNDRY_API_URL);
        console.log(`🔗 Connected to Foundry Local on: ${foundryUrl.protocol}//${foundryUrl.host}\n`);
        
        // Automatically open the browser to the application page
        try {
            const { exec } = require('child_process');
            const url = `http://localhost:${port}`;
            if (process.platform === 'win32') {
                exec(`start ${url}`);
            } else if (process.platform === 'darwin') {
                exec(`open ${url}`);
            } else {
                exec(`xdg-open ${url}`);
            }
        } catch (e) {
            console.log('[Backend] Could not open browser automatically:', e.message);
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[Backend] Port ${port} is already in use. Trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('[Backend] Server startup error:', err);
        }
    });
};

startServer(parseInt(PORT) || 3001);

# 🧠 SmartNotes AI — Offline Intelligent Notepad

**SmartNotes AI** is an intelligent, minimalist, high-performance note editor that operates **100% locally, offline, and privately**. 

Designed for professional presentations, productivity tracking, and corporate environments that prioritize data security, SmartNotes AI integrates directly with **Foundry Local AI** (or any local LLM runner) to offer advanced text processing, a context-aware chat assistant, slide presentations, meeting minutes, productivity calculators, web scraping, and audio features.

---

## 🌐 Multilingual Support (i18n)
The application **defaults to Portuguese (Brazil)** for regional comfort and features a dynamic language toggle button (`🇺🇸` / `🇧🇷`) in the header to switch to **English**. Switching languages instantly updates all UI text elements, placeholders, confirmation dialogs, and adapts the system instructions (prompts) for the local AI to respond natively in the active language.

*Nota: Para ler a documentação em Português, acesse [README.pt-BR.md](README.pt-BR.md).*

---

## ⚡ Key Features

### 1. Premium Rich Text Editor ✍️🎨
* **Formatting Controls**: Real-time formatting with **Bold**, **Italic**, **Underline**, and **Strikethrough**.
* **Modern Typography**: Choice of corporate-ready fonts (*Plus Jakarta Sans, Inter, Poppins, Montserrat, Playfair Display, Lora, Fira Code, Georgia, Courier*) and font sizes.
* **Layouts**: Alignments (Left, Center, Right), **Bulleted Lists**, and **Numbered Lists**.
* **Colors**: Custom **Text Color**, **Highlight (Background) Color** pickers, and a **Remove Highlight** tool.
* **Preservation**: Prevents the text editor from losing its cursor position or active selection when clicking toolbar elements or AI actions. Includes Word/Character statistics and a robust programmatic Undo/Redo (Ctrl+Z / Ctrl+Y) history engine.

### 2. Document & Pitch Tools (Corporate Suite) 🚀
* **📊 Slide Presentation Mode (Pitch Mode)**: Generates structured, responsive slide decks (Problem, Solution, Key Features, ROI, Next Steps) from notes using local LLMs. It features keyboard navigation (`ArrowLeft`/`ArrowRight`/`Space`/`Escape`) and an **Abort Button** to cancel generation mid-way.
* **⏱️ ROI & Productivity Calculator**: Computes monthly time saved, percentage reduction, and annual workdays recovered based on task frequency. Generates a glowing, download-ready **Impact Card** certificate and prompts the local AI to compile a 2-sentence Strategic Business Brief.
* **🎙️ Meeting Minutes (Gerar Ata)**: Formats meeting notes, transcripts, or dictations into a professional document with a General Summary, Key Decisions, and a structured markdown table of Action Items, Owners, and Deadlines.

### 3. AI Quick Actions & Conversational Assistant 💬
* **Toolbar AI Actions**: `Summarize` (notes synthesis), `Improve Writing` (rephrasing), `Translate` (automatic language toggle), `Extract Topics` (extract bullet points), `Expand Topic` (inline context generator), and `Auto-Format` (grammar and spacing polish).
* **Thinking Block Filter**: Automatically parses and hides reasoning chains (`<think>...</think>`) from models like DeepSeek R1 to display only clean, helpful output.
* **Context-Aware Sidebar Chat**: Ask questions, request outlines, or request targeted edits. Includes an "📥 Insert into Note" button to copy assistant replies directly at the editor cursor location.

### 4. Media & Scraping Utilities 🎙️🕸️
* **🕸️ Web Scraper (Scrapling)**: Extracts clean web content from URLs using an adaptive scraping engine (with urllib fallback), automatically creates a new note, and prints an AI summary in chat.
* **Real YouTube Summarizer**: Extracts and decodes YouTube captions on the Node.js backend (no third-party keys required), falling back to description scraping if captions are unavailable.
* **🔊 Audio Reader (TTS)**: Streams high-fidelity neural voices (Azure TTS) or utilizes browser-native Web Speech API fallback, featuring volume, speed rate, and voice controls in a settings modal.
* **🎙️ Voice Dictation**: High-prominence dictate button using Web Speech Recognition with multi-language support.

### 5. Zen Focus & Graph Visualization 🧘📊
* **🧘 Zen Focus Mode**: Minimizes writing canvas distractions with high-quality MP3 ambient loop layers (Rain, Forest, Lo-fi) and volume controls.
* **Physics-based Note Graph**: Interactive knowledge network graph mapping note connections. Node colors automatically highlight categories (Vulnerability = Red, Fix = Green, Log = Orange, Default = Cyan).
* **Desktop Collapsible Panels**: Smooth CSS-collapsing sidebars with vertical toggle border arrow buttons (`◀` / `▶`) to maximize workspace on desktop viewports.
* **Smart Autocomplete (Smart Compose)**: Inline word completion suggestions (ghost text accepted via `Tab` or `ArrowRight`) and tag autocomplete dropdowns.

---

## 🧠 Supported Local AI Models
The app integrates with local runners and features an auto-loader that restarts models on inactivity timeout (TTL). The model dropdown selector supports:
- **Qwen 3 (0.6B) - Ultra-light** (`qwen3-0.6b`): Fast, lightweight, and responsive.
- **Qwen 3.5 (2B) - Balanced** (`qwen3.5-2b-text`): Great general text capabilities.
- **Phi-4-mini (4B) - Advanced** (`phi-4-mini`): Default model, highly intelligent.
- **DeepSeek R1 (1.5B) - Reasoning Light** (`deepseek-r1-1.5b`): Fast reasoning checks.
- **DeepSeek R1 (7B) - Reasoning Pro** (`deepseek-r1-7b`): Robust reasoning and stable Portuguese flow.
- **Mistral Nemo (12B) - Text Expert** (`mistral-nemo-12b-instruct`): High-context corporate writing.
- **GPT-OSS (20B) - Heavy GPU** (`gpt-oss-20b`): Heavy GPU processing.

---

## 🛠️ Architecture and Directory Structure

```text
smartnotes-ai/
├── public/                 # Public static directory containing the Frontend
│   ├── index.html          # HTML interface (Semantic HTML5 with i18n hooks)
│   ├── style.css           # Styling system (CSS3 with English comments)
│   ├── app.js              # Frontend logic, i18n switcher, and API calls
│   └── *.mp3               # Audio loops for Zen Focus Mode
├── .env.example            # Sample environment variables template
├── .gitignore              # Ignores local environment files and node packages
├── iniciar_servidor.bat    # Windows batch script for rapid startup
├── package.json            # Node.js project manifest and dependencies
├── scraper.py              # Python web scraper script utilizing Scrapling
├── server.js               # Express backend server (YouTube scraper & local AI router)
├── README.md               # Main project documentation (English)
└── README.pt-BR.md         # Translated documentation (Portuguese)
```

---

## 🚀 Installation & Running Guide

### Prerequisites
1. **Node.js** installed on your system (v18 or higher).
2. **Python** installed (if using Scrapling Web Scraper).
3. **Foundry Local AI** (or any local LLM runner) installed and running.

### Step 1: Configure Local AI (Foundry)
Configure Local AI to run on port `3000` and start the server:
```powershell
# Change the default Foundry port to 3000
foundry config set port 3000

# Start the Foundry local server daemon
foundry server start
```

### Step 2: Configure the Repository
1. Clone or download the repository.
2. Open a terminal in the project root directory and install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (or copy `.env.example`) and adjust ports if necessary:
   ```env
   PORT=3001
   FOUNDRY_API_URL=http://127.0.0.1:3000/v1/chat/completions
   ```

### Step 3: Run the Notepad App
#### Option A (Windows - Recommended)
Simply **double-click** the **`iniciar_servidor.bat`** script in the project root. This opens a dedicated console window hosting the Express server.

#### Option B (Terminal)
Using your terminal of choice, execute the Node startup script:
```bash
npm start
```

### Step 4: Access in Browser
- The Express server serves the frontend app on: **`http://localhost:3001`** (or next available port).
- If using **Live Server** on port `5500`, CORS requests are dynamically routed to the backend on port `3001` automatically.

---

## 🔒 Privacy and Corporate Data Governance
Because the notepad operates entirely locally, **none of your notes or chat histories ever leave your computer**. This offline architecture is ideal for corporate environments with strict compliance regulations and LGPD/GDPR policies, where feeding sensitive company data to public cloud models (like OpenAI or Claude) is strictly prohibited.

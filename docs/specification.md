# SmartNotes AI - Especificação Funcional e Técnica (SDD)

Este documento define a especificação completa de comportamento, arquitetura e integração do projeto **SmartNotes AI** de acordo com a metodologia **Spec-Driven Development (SDD)**.

---

## 1. Visão Geral da Aplicação
O **SmartNotes AI** é um ambiente completo e inteligente de anotações projetado para maximizar a produtividade e a privacidade do usuário. Toda a inteligência artificial da aplicação é processada de maneira **local e offline**, eliminando custos de API e mitigando riscos de vazamento de dados confidenciais (em conformidade com a LGPD).

---

## 2. Requisitos e Funcionalidades do Frontend

### 2.1 Gerenciamento de Notas e Persistência
* **Persistência:** As notas devem ser persistidas localmente no navegador utilizando a `localStorage` (sob a chave `smartnotes_notes`).
* **Histórico (Desfazer/Refazer):** O editor deve manter uma pilha de estados (`undoStack` e `redoStack`) para permitir reverter e avançar alterações locais (atalhos `Ctrl+Z` e `Ctrl+Y`).
* **Estatísticas Dinâmicas:** A barra de status deve exibir o tempo estimado de leitura e a quantidade de caracteres/palavras atualizados em tempo real conforme a digitação.
* **Ordenação por Arrasto (Drag & Drop):** O usuário deve poder reordenar manualmente a prioridade das notas na barra lateral clicando e arrastando o item da lista.

### 2.2 Grafo de Conhecimento 2D (Obsidian-Style)
* **Objetivo:** Visualização interativa que facilita a identificação de correlações conceituais entre anotações.
* **Nós (Bolinhas):**
  * Notas são representadas por nós **azul-ciano** (ou vermelho/verde/laranja se tiverem tags de criticidade). O tamanho do nó é proporcional ao número de palavras.
  * Tags são representadas por nós coloridos. O tamanho é proporcional ao número de notas vinculadas.
* **Conexões (Linhas):**
  * Linhas sólidas conectam Notas às suas respectivas Tags.
  * Linhas tracejadas roxas conectam Notas a outras Notas (**Conexões Semânticas**), criadas automaticamente se uma nota contiver o título de outra nota em seu texto.
* **Comportamento Interativo:**
  * Ao passar o mouse sobre um nó, todos os nós e linhas não conectados a ele devem ter a opacidade reduzida para `15%` (Efeito Foco/Highlight).
  * Exibe um tooltip flutuante na tela contendo a pré-visualização rápida do texto da nota (primeiros 120 caracteres) ou contagem de vínculos da tag.
  * Permite zoom via scroll da roda do mouse e botões flutuantes (`＋`, `－`, `⟲`).
  * Dois cliques em um nó de nota fecha o grafo e abre a nota correspondente no editor principal.

### 2.3 Modo Zen e Widget de Som
* **Interface Minimalista:** O Modo Zen oculta a barra lateral, o painel do assistente de chat e a barra de ferramentas de IA para focar a tela inteira exclusivamente na escrita.
* **Áudio Procedural/Ambiente:** Um widget flutuante no canto inferior esquerdo deve permitir a reprodução combinada e controle individual de volume de trilhas de áudio: Chuva (`rain.mp3`), Floresta (`florest.mp3`) e Música Lo-Fi (`LOFI.mp3`).
* **Botão de Saída:** Um botão flutuante persistente "Sair do Modo Zen" deve permanecer visível no canto superior direito para retornar a interface ao modo normal.

### 2.4 Acessibilidade
* **Digitação por Voz (Ditado):** Utiliza a Web Speech API (`SpeechRecognition`) para converter a fala do usuário em texto diretamente na posição do cursor do editor.
* **Leitor de Áudio (Texto-para-Fala):** Lê em voz alta o texto selecionado na nota (ou o conteúdo inteiro se nada estiver selecionado) utilizando a síntese nativa do navegador ou o serviço premium via backend.

---

## 3. Integração com IA Local (Foundry Local / Ollama)
O frontend faz requisições assíncronas para o backend local, especificando o modelo selecionado no seletor de modelos.

### 3.1 Modelos Suportados
* **Qwen 3.5 (2B):** Modelo leve para respostas rápidas (`qwen3-0.6b-generic-gpu`).
* **Phi-4-mini (4B):** Modelo avançado para raciocínio estruturado (`Phi-4-mini-instruct-generic-cpu`).
* **DeepSeek R1 (1.5B/7B):** Modelos de raciocínio profundo.
* **GPT-OSS (20B):** Modelo pesado para servidores com GPU dedicada (`gpt-oss-20b-generic-gpu`).

### 3.2 Ações Rápidas de IA
A IA é instruída através de prompts de sistema específicos para executar:
* **Resumir:** Produzir um resumo executivo estruturado do texto.
* **Melhorar Escrita:** Corrigir gramática, concordância e elevar o nível do vocabulário.
* **Traduzir:** Traduzir entre Inglês e Português dependendo da preferência de idioma da interface.
* **Gerar Ata:** Transformar notas caóticas de reuniões em uma ata formal de decisões.
* **Apresentar Pitch:** Dividir o conteúdo da nota em uma apresentação estruturada de 5 slides em JSON.
* **Calculadora de ROI:** Estimar a economia de tempo com o uso de IA e gerar relatório de valor estratégico.

### 3.3 Simulação de IA (Offline Fallback)
Caso o servidor de IA local (Foundry/Ollama) não esteja ativo, o backend possui uma função de simulação que gera respostas pré-programadas com base em heurísticas do prompt enviado (ex: gerando resumos fictícios estruturados, formatação padrão ou tradução de palavras-chave) para garantir que a aplicação nunca quebre em demonstrações offline.

# Wazzup — EnglishTalks (IFES)

Plataforma web de comunicação e prática interativa de língua inglesa desenvolvida especificamente para discentes e monitores do **Instituto Federal do Espírito Santo (IFES)**.

O sistema proporciona interação em duplas/grupos em salas temáticas dinâmicas com supervisão ativa de monitores, ferramentas pedagógicas integradas (dicionário em contexto, tradução, atalhos de correção rápida) e alternância entre temas Claro e Escuro.

---

## Identidade Visual e Paleta de Cores Institucional (IFES)

O software adota com exclusividade a paleta visual do Instituto Federal:

* **Ação e Marca:**
  * **Verde IF (`--color-primary`):** `#009639` (Botões principais, cabeçalhos, balão próprio de chat)
  * **Verde IF Hover (`--color-primary-dark`):** `#007A2E` (Estados de hover e foco)
  * **Vermelho IF (`--color-accent-alert`):** `#C8102E` (Botão "Chamar Monitor", alertas e urgências)
* **Neutros e Superfícies (Modo Claro):**
  * **Fundo Primário:** `#FFFFFF`
  * **Fundo Secundário:** `#F4F6F8` (Áreas de digitação e mensagens de colegas)
  * **Bordas:** `#E2E8F0`
  * **Texto Principal:** `#1E293B`
  * **Texto Secundário / Muted:** `#64748B`
* **Neutros e Superfícies (Modo Escuro):**
  * **Fundo Primário:** `#0F172A`
  * **Fundo Secundário:** `#1E293B`
  * **Bordas:** `#334155`
  * **Texto Principal:** `#F8FAFC`
  * **Texto Secundário / Muted:** `#94A3B8`

---

## Estrutura do Monorepo

```text
EnglishTalks/
├── shared/            # Contratos de eventos Socket.io e DTOs compartilhados
├── server/            # Backend Node.js + Express + Socket.io + Prisma ORM
│   ├── prisma/        # Schema de modelagem PostgreSQL
│   └── src/           # Handlers de socket, serviços de salas e dicionário
├── client/            # Frontend React + Vite + TypeScript (100dvh, Design Tokens)
│   ├── src/components # Dicionário em contexto, cabeçalho e componentes UI
│   └── src/pages      # Lobby, Sala de Chat do Aluno e Painel do Monitor
└── IMPLEMENTATION_PLAN.md # Planejamento arquitetural completo
```

---

## Como Executar

### Opção 1: Execução com Docker & Docker Compose (Recomendado)

Toda a stack (PostgreSQL 16, Backend Node.js e Frontend Nginx) pode ser inicializada com um único comando:

1. **Copiar o arquivo de variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

2. **Subir os containers:**
   ```bash
   docker compose up --build
   ```

3. **Acessar os serviços:**
   * **Aplicação Web (Aluno e Monitor):** [http://localhost:3000](http://localhost:3000)
   * **API Backend e WebSockets:** [http://localhost:4000](http://localhost:4000)
   * **Banco de Dados PostgreSQL:** `localhost:5432`

---

### Opção 2: Execução Local (Sem Docker)

1. **Instalação das Dependências:**
   ```bash
   npm install
   ```

2. **Compilar os Contratos Compartilhados:**
   ```bash
   npm run build --workspace=shared
   ```

3. **Executar em Modo de Desenvolvimento:**
   * **Backend (Porta 4000):**
     ```bash
     npm run dev:server
     ```
   * **Frontend (Porta 5173):**
     ```bash
     npm run dev:client
     ```

---

## Recursos Implementados

1. **Acesso Minimalista:** Exige apenas o *nickname* do aluno e o *código da sala* para iniciar a prática.
2. **Salas Temáticas com Ocupação em Tempo Real:** Visualização da lotação das salas (ex: `1/4`, `2/4`) atualizada via WebSockets com fallback em Polling para redes restritas.
3. **Tópicos Disparadores (Conversation Prompts):** Pergunta pedagógica guia fixada no topo de cada sala para destravar conversas.
4. **Módulo de Ajuda ("Chamar Monitor"):** Permite que alunos solicitem apoio diretamente da sala em que estão; o chamado aparece instantaneamente no painel dos monitores.
5. **Dicionário em Contexto & Sinônimos:** Acesso a definições em inglês, transcrição fonética e sinônimos com um clique ou duplo clique sobre qualquer palavra no chat.
6. **Painel Centralizado do Monitor:**
   * Visão multi-salas com ocupação e participantes ativos;
   * Fila de suporte com botões para atender e concluir chamados;
   * Atalhos de correção gramatical em 1 clique (3ª pessoa, tempos verbais, adjetivos);
   * Atualização dinâmica de tópicos disparadores de conversa.
7. **Tema Claro e Escuro Obrigatório:** Alternância acessível com um clique e persistência no navegador.

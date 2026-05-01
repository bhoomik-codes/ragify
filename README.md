<div align="center">

# 🧠 Ragify

**Build, configure, and chat with your own Retrieval-Augmented Generation bots.**

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![CSS Modules](https://img.shields.io/badge/CSS_Modules-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)

[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com)
[![Anthropic](https://img.shields.io/badge/Anthropic-D4A574?style=flat-square&logo=anthropic&logoColor=white)](https://console.anthropic.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Mistral](https://img.shields.io/badge/Mistral_AI-FF7000?style=flat-square&logo=mistral&logoColor=white)](https://mistral.ai)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-000000?style=flat-square&logo=vercel&logoColor=white)](https://sdk.vercel.ai)
[![NextAuth](https://img.shields.io/badge/NextAuth_v5-9353D3?style=flat-square&logo=auth0&logoColor=white)](https://authjs.dev)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)](https://zod.dev)

<br/>

[Features](#-features) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Security](#-security) · [Roadmap](#-roadmap)

</div>

---

## ✨ Features

- **🔑 Bring-Your-Own-Key** — Use your own API keys for OpenAI, Anthropic, Google Gemini, or Mistral. Keys are encrypted at rest with AES-256-GCM. Zero LLM cost for the platform.
- **💬 Real-Time Streaming Chat** — Live token-by-token responses powered by the Vercel AI SDK, with markdown rendering and source citations.
- **📂 Document Upload & Retrieval** — Upload documents (TXT, MD, PDF) during RAG creation or directly mid-chat via the 📎 button. Keyword retrieval surfaces relevant context to the LLM.
- **🎛️ In-Chat Model Switcher** — Switch between 20+ models from all providers on the fly from a dropdown — no need to leave the conversation.
- **⚙️ Live Bot Tuning** — Adjust temperature, max tokens, top-p, and system prompt from a slide-out panel without leaving the chat.
- **🛡️ Granular Error Handling** — Distinct, actionable error banners for invalid keys, exhausted credits, rate limits, model-not-found, and context overflow.
- **🏗️ Multi-Step Creation Wizard** — A guided 6-step wizard: name → model → retrieval → safety → upload → review.
- **🔒 Platform API Keys** — Generate `rag_`-prefixed keys for programmatic access, hashed with bcrypt. Revealed once, never stored in plaintext.
- **🌙 Dark/Light Themes** — Full theme support via CSS custom properties. No Tailwind — pure vanilla CSS Modules.

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
| :--- | :--- |
| **Node.js** | `≥ 20.x` |
| **npm** | `≥ 10.x` (ships with Node 20) |

### Step 1 — Clone & Install

```bash
git clone https://github.com/bhoomik-codes/ragify.git
cd ragify
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env
```

Now generate the two **required** secrets and paste them into `.env`:

```bash
# Generate ENCRYPTION_KEY (64 hex chars — used for AES-256-GCM):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate AUTH_SECRET (NextAuth session signing):
openssl rand -base64 32
```

Your `.env` should look like:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<paste-your-auth-secret-here>"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="<paste-your-64-hex-char-key-here>"
MOCK_MODE="false"
```

### Step 3 — Initialize the Database

```bash
npx prisma db push
npx prisma generate
```

### Step 4 — Start the Dev Server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**, register an account, and create your first RAG.

### 🧪 Running Without API Keys (Mock Mode)

Don't have LLM API keys yet? No problem — set `MOCK_MODE="true"` in `.env` to run with simulated responses. This lets you explore the full UI, upload documents, and test the creation wizard without spending a cent.

### 🔑 Adding Your LLM Keys

Once running, navigate to **Settings → Provider Keys** in the app. Add your API key for any provider (OpenAI, Anthropic, Google, Mistral). Keys are encrypted with AES-256-GCM before touching the database — the raw key is never stored.

---

## 🏛️ Architecture

### Retrieval flow (high level)

- **Vector search first**: if an embedding model is available, Ragify embeds the user query and retrieves the top-K most similar chunks.
- **Keyword fallback**: if vector retrieval is unavailable or returns no results, Ragify falls back to SQLite **FTS5** keyword search.
- **No-context response**: if both return no matches, Ragify responds neutrally instead of injecting arbitrary chunks into the context window.

```
ragify/
├── app/
│   ├── (auth)/               # Login, Signup, Forgot/Reset Password
│   ├── (app)/                # Protected routes (requires session)
│   │   ├── dashboard/        # RAG cards grid
│   │   │   └── new/          # 6-step creation wizard
│   │   ├── rags/[ragId]/
│   │   │   └── chat/         # Chat UI (model switcher, params panel, upload)
│   │   └── settings/         # BYOK & Platform key management
│   ├── (marketing)/          # Public landing page
│   └── api/
│       ├── auth/             # NextAuth handlers + credential flows
│       ├── rags/             # CRUD, streaming chat, document upload
│       │   └── [id]/
│       │       ├── chat/     # POST — streaming chat endpoint
│       │       └── documents/ # POST — in-chat file upload
│       └── users/me/
│           ├── provider-keys/ # BYOK key CRUD
│           └── platform-keys/ # Platform API key CRUD
│
├── components/
│   ├── layout/               # AppShell, Sidebar, TopBar, ThemeToggle
│   ├── settings/             # ProviderKeyManager, PlatformKeyManager
│   ├── shared/               # ConfirmDialog, EmptyState, OnboardingTour
│   └── ui/                   # Button, Card, Input, Modal, Badge, Spinner
│
├── lib/
│   ├── auth.ts               # NextAuth v5 config (credentials provider)
│   ├── crypto.ts             # AES-256-GCM encrypt/decrypt + bcrypt
│   ├── llm.ts                # Provider-agnostic streaming + error classification
│   ├── pipeline.ts           # Document parse → chunk → embed pipeline
│   ├── vector.ts             # Cosine similarity, serialize, searchChunks
│   ├── validators.ts         # Zod schemas for all API payloads
│   ├── types.ts              # SSoT for enums, DTOs, interfaces
│   ├── mappers.ts            # Prisma row → safe DTO mapping
│   ├── db.ts                 # Prisma client singleton
│   └── mail.ts               # Email transport (password reset)
│
├── prisma/
│   └── schema.prisma         # Database schema
│
├── middleware.ts              # Auth route protection
└── .env.example               # Template for environment variables
```

---

## 🛠 Tech Stack

| Layer | Technology | Badge |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | ![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white&style=flat-square) |
| **Language** | TypeScript 5.9 (strict) | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat-square) |
| **Runtime** | Node.js 22 | ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white&style=flat-square) |
| **Auth** | NextAuth v5 (Auth.js) | ![Auth.js](https://img.shields.io/badge/Auth.js-9353D3?style=flat-square) |
| **ORM** | Prisma 7 | ![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white&style=flat-square) |
| **Database** | SQLite (dev) → PostgreSQL (prod) | ![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white&style=flat-square) |
| **AI / LLM** | Vercel AI SDK v3.4.x | ![Vercel](https://img.shields.io/badge/AI_SDK-000?logo=vercel&logoColor=white&style=flat-square) |
| **Validation** | Zod | ![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white&style=flat-square) |
| **Styling** | Vanilla CSS Modules | ![CSS3](https://img.shields.io/badge/CSS_Modules-1572B6?logo=css3&logoColor=white&style=flat-square) |
| **Encryption** | AES-256-GCM + bcrypt | ![Shield](https://img.shields.io/badge/AES--256--GCM-critical?style=flat-square) |

### Supported LLM Providers

| Provider | Models |
| :--- | :--- |
| ![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white&style=flat-square) | GPT-4o, GPT-4o mini, o4-mini, o3-mini, o1, GPT-4 Turbo, GPT-3.5 Turbo |
| ![Anthropic](https://img.shields.io/badge/Anthropic-D4A574?logo=anthropic&logoColor=white&style=flat-square) | Claude Opus 4.5, Sonnet 4.5, 3.7 Sonnet, 3.5 Sonnet, 3.5 Haiku, 3 Opus |
| ![Google](https://img.shields.io/badge/Gemini-4285F4?logo=googlegemini&logoColor=white&style=flat-square) | Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash, 1.5 Pro, 1.5 Flash |
| ![Mistral](https://img.shields.io/badge/Mistral-FF7000?logo=mistral&logoColor=white&style=flat-square) | Mistral Large, Medium, Small, Codestral, Mixtral 8x22B |

---

## 🔒 Security

| Concern | Implementation |
| :--- | :--- |
| **Provider API keys** | AES-256-GCM with unique IV per key |
| **Platform API keys** | bcrypt hashed; raw key shown exactly once |
| **Route authorization** | IDOR check (`userId` match) on every API route |
| **Input validation** | Zod schemas on all API payloads |
| **DTO mapping** | Raw Prisma objects never returned to clients |
| **Error classification** | LLM errors mapped to specific codes (no stack leaks) |
| **Secrets** | `.env` excluded from git; `ENCRYPTION_KEY` required |

---

## 📋 Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | ✅ | `file:./dev.db` | Database connection string |
| `AUTH_SECRET` | ✅ | — | NextAuth session signing key |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | App base URL for NextAuth callbacks |
| `ENCRYPTION_KEY` | ✅ | — | 64-char hex string for AES-256-GCM |
| `MOCK_MODE` | ❌ | `"false"` | Set `"true"` to bypass real LLM calls |
| `MOCK_PIPELINE_DELAY_MS` | ❌ | `500` | Simulated pipeline delay (ms) |
| `OPENAI_API_KEY` | ❌ | — | Platform-level OpenAI fallback key |
| `ANTHROPIC_API_KEY` | ❌ | — | Platform-level Anthropic fallback key |
| `GOOGLE_API_KEY` | ❌ | — | Platform-level Google fallback key |
| `MISTRAL_API_KEY` | ❌ | — | Platform-level Mistral fallback key |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Create an optimized production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint checks |
| `npm test` | Run unit tests (Vitest) |
| `npx prisma studio` | Open Prisma's visual database browser |
| `npx prisma db push` | Push schema changes to the database |
| `npx tsc --noEmit` | Type-check the project without emitting files |

---

## 🗺️ Roadmap

- [x] Authentication & Dashboard
- [x] Multi-step RAG creation wizard
- [x] Streaming chat with Vercel AI SDK
- [x] Document ingestion pipeline (OOM-safe batching)
- [x] BYOK provider key management
- [x] Platform API keys
- [x] In-chat model switcher
- [x] Bot parameter tuning panel
- [x] In-chat document upload
- [x] Granular LLM error classification
- [x] Dashboard Bot Management (Edit/Delete)
- [x] Chat History Sidebar & Resumption
- [x] Real embedding API integration (Ollama & OpenAI)
- [x] Hybrid Retrieval (Vector search + FTS5 fallback)
- [ ] Internet Search Integration (Tavily/Serper)
- [ ] Public RAG sharing links
- [ ] S3/R2 object storage for documents
- [ ] Analytics dashboard (token usage, response times)
- [ ] PostgreSQL & pgvector migration
- [ ] Dedicated Worker Queue (Redis/BullMQ)


---

## 📝 Changelog
### v0.2.2 - Stability & UX Hardening

- **Memory Stabilization**: Implemented batch-processing in the ingestion pipeline to prevent Heap Out of Memory (OOM) errors during large document processing.
- **Improved UX**: Added a "Retry" button and detailed error messaging (e.g., "Rate limited") for document uploads in the creation wizard.
- **Rate Limit Optimization**: Increased document upload rate limits from 10 to 50 per minute to better support large batch uploads.
- **Mermaid Diagram Reliability**: 
  - Updated system prompts with strict syntax rules for modern Mermaid (flowchart TD, quoted labels).
  - Enhanced the Mermaid component to capture and display actual parser errors instead of hanging on failures.
- **Infrastructure & Testing**: 
  - Expanded test suite with comprehensive integration tests for API routes and pipeline logic.
  - Hardened repository management by tracking `FUTURE_PLAN.md` and ignoring SQLite temporary artifacts (`.db-wal`, `.db-shm`).


### v0.2.1 - Recent Updates

- **Ingestion reliability**: Upload ingestion no longer detaches a background promise that can be killed in serverless runtimes; temp files are always cleaned up.
- **No-context handling**: Removed the “stuff the first 3 chunks” fallback; unrelated questions now return a neutral “no relevant information found” response.
- **Upload security**:
  - Filename sanitization + upload-dir containment to prevent path traversal
  - Strict allowlist validation (415) for: `.txt` / `.md` / `.pdf` / `.docx` / `.csv`
  - 10MB max upload size (413) + basic per-user upload rate limit (429)
- **Performance**:
  - Vector retrieval yields to the event loop during similarity scoring and caps embeddings per query (with pgvector migration guidance in `FUTURE_PLAN.md`)
  - Keyword fallback upgraded to SQLite **FTS5** (with raw SQL migration + safe fallback if not applied)
- **Pipeline quality & resilience**:
  - Semantic chunking (paragraph → line → sentence → word) with overlap preservation
  - Extraction failures mark the document as `FAILED` with a human-readable `errorMessage`
- **Tests & maintenance**:
  - Added unit tests for vector utilities + chunking
  - Standardized module imports and added a minimal Vitest runner (`npm test`)

### v0.2.0 - List of Updates

- **Enhanced Chat Experience**: Introduced a collapsible sidebar for managing conversation history, allowing users to seamlessly
resume previous chats or start new ones.
- **Bot Lifecycle Management**: Added Edit and Delete functionality directly from the dashboard bot cards.
- **Improved RAG Creation Wizard**: Integrated dropdowns for model selection based on providers, and added an interactive emoji
picker for bot avatars.
- **Local Model Support**: Added support for local Ollama models (including Qwen3 and Deepseek) alongside cloud providers.
- **Secure File Uploads**: Users can now upload various documents (.txt, .md, .csv, .pdf, .docx, .pptx) directly into an active
chat context.

---

## 🐛 Troubleshooting

<details>
<summary><b>Prisma: "Cannot find module '@prisma/client'"</b></summary>

Run `npx prisma generate` to regenerate the Prisma client after any schema change.
</details>

<details>
<summary><b>Hydration mismatch errors</b></summary>

The `Modal` component uses a `mounted` state pattern to avoid server/client mismatch. If you see hydration errors after adding a new modal, ensure it returns `null` on the first render pass.
</details>

<details>
<summary><b>"Invalid payload" when saving provider keys</b></summary>

The validator trims whitespace automatically. If the error persists, check that the key format matches the provider's expected pattern (e.g., `sk-...` for OpenAI).
</details>

<details>
<summary><b>ENCRYPTION_KEY errors on startup</b></summary>

The key must be exactly 64 hex characters. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

</details>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/bhoomik-codes">bhoomik-codes</a></sub>
</div>

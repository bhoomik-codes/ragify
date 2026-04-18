<div align="center">

# 🧠 Ragify

**Build, configure, and chat with your own Retrieval-Augmented Generation bots.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) · [Getting Started](#-getting-started) · [Architecture](#-architecture) · [Stack](#-tech-stack) · [Security](#-security)

</div>

---

## ✨ Features

- **🔑 Bring-Your-Own-Key** — Use your own API keys for OpenAI, Anthropic, Google Gemini, or Mistral. Keys are encrypted at rest with AES-256-GCM. Zero LLM cost for the platform.
- **💬 Real-Time Streaming Chat** — Live token-by-token responses powered by the Vercel AI SDK, with markdown rendering and source citations.
- **📂 Document Upload & Retrieval** — Upload documents (TXT, MD, PDF) during RAG creation or directly in chat. Keyword retrieval surfaces relevant context to the LLM.
- **🎛️ In-Chat Model Switcher** — Switch between models on the fly from a dropdown in the chat header — no need to leave the conversation.
- **⚙️ Live Bot Tuning** — Adjust temperature, max tokens, top-p, and system prompt from a slide-out panel without leaving the chat.
- **🛡️ Granular Error Handling** — Distinct, actionable error banners for invalid keys, exhausted credits, rate limits, model-not-found, and context overflow.
- **🏗️ Multi-Step Creation Wizard** — A guided 6-step wizard for creating RAGs: name, model, retrieval settings, safety, upload, and review.
- **🔒 Platform API Keys** — Generate `rag_`-prefixed API keys for programmatic access, hashed with bcrypt. Revealed once, never stored in plaintext.
- **🌙 Dark/Light Themes** — Full theme support via CSS custom properties. No Tailwind — pure vanilla CSS Modules.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **npm** (`pnpm` or `yarn` also work)

### Setup

```bash
# Clone the repository
git clone https://github.com/bhoomik-codes/ragify.git
cd ragify

# Install dependencies
npm install

# Set up environment
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
# Generate ENCRYPTION_KEY (required):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate AUTH_SECRET (required):
openssl rand -base64 32
```

```bash
# Initialize the database
npx prisma db push
npx prisma generate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

### Mock Mode

Set `MOCK_MODE="true"` in `.env` to bypass all real LLM calls — useful for development and testing without API keys.

---

## 🏛️ Architecture

```
app/
├── (auth)/           # Login, Signup, Password Reset
├── (app)/            # Authenticated routes
│   ├── dashboard/    # RAG cards grid + creation wizard
│   ├── rags/[id]/    # Chat interface
│   └── settings/     # BYOK & Platform keys
├── (marketing)/      # Landing page
└── api/              # REST API routes
    ├── auth/         # NextAuth + credential flows
    ├── rags/         # CRUD, Chat streaming, Doc upload
    └── users/        # Profile, Provider keys, Platform keys

lib/
├── auth.ts           # NextAuth v5 configuration
├── crypto.ts         # AES-256-GCM encryption & bcrypt hashing
├── llm.ts            # Provider-agnostic streaming engine
├── pipeline.ts       # Document ingestion (parse → chunk → embed)
├── vector.ts         # Cosine similarity & vector search
├── validators.ts     # Zod schemas
├── types.ts          # Single source of truth for all TypeScript types
└── mappers.ts        # Prisma → DTO mapping

components/
├── layout/           # AppShell, Sidebar, TopBar, ThemeToggle
├── settings/         # ProviderKeyManager, PlatformKeyManager
├── shared/           # ConfirmDialog, EmptyState, OnboardingTour
└── ui/               # Button, Card, Input, Modal, Badge, Spinner
```

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.9 |
| **Auth** | NextAuth v5 (Auth.js) with DB sessions |
| **Database** | Prisma 7 + SQLite (dev) → PostgreSQL (prod) |
| **Styling** | Vanilla CSS Modules |
| **AI** | Vercel AI SDK `v3.4.x` (pinned) |
| **Providers** | OpenAI, Anthropic, Google Gemini, Mistral |

---

## 🔒 Security

| Concern | Implementation |
| :--- | :--- |
| Provider API keys | AES-256-GCM with unique IV per key |
| Platform API keys | bcrypt hashed, raw key shown once |
| Route authorization | IDOR check (`userId` match) on every API route |
| Input validation | Zod schemas on all API payloads |
| DTO mapping | Raw Prisma objects never returned to clients |
| Secrets | `.env` excluded from git; `ENCRYPTION_KEY` required |

---

## 📋 Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | ✅ | Database connection string |
| `AUTH_SECRET` | ✅ | NextAuth session signing key |
| `ENCRYPTION_KEY` | ✅ | 64-char hex string for AES-256-GCM |
| `MOCK_MODE` | ❌ | Set `"true"` to bypass real LLM calls |
| `MOCK_PIPELINE_DELAY_MS` | ❌ | Simulated pipeline delay (default: 500) |
| `OPENAI_API_KEY` | ❌ | Platform-level OpenAI fallback key |
| `ANTHROPIC_API_KEY` | ❌ | Platform-level Anthropic fallback key |
| `GOOGLE_API_KEY` | ❌ | Platform-level Google fallback key |
| `MISTRAL_API_KEY` | ❌ | Platform-level Mistral fallback key |

---

## 🗺️ Roadmap

- [x] Authentication & Dashboard
- [x] Multi-step RAG creation wizard
- [x] Streaming chat with Vercel AI SDK
- [x] Document ingestion pipeline
- [x] BYOK provider key management
- [x] Platform API keys
- [x] In-chat model switcher
- [x] Bot parameter tuning panel
- [x] In-chat document upload
- [x] Granular LLM error classification
- [ ] Real embedding API integration (replace keyword search)
- [ ] Analytics dashboard
- [ ] Public RAG sharing links
- [ ] S3/R2 object storage for documents

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/bhoomik-codes">bhoomik-codes</a></sub>
</div>

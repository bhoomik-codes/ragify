# Ragify — Bring-Your-Own-Key RAG Platform

Ragify is a full-featured, multi-tenant **Retrieval-Augmented Generation (RAG)** chatbot platform. It allows users to create, configure, and chat with their own RAG bots, each backed by custom uploaded documents and personalized retrieval settings.

## 🚀 Key Features

*   **Multi-Tenant Architecture:** Secure isolation between different users, their configurations, documents, API keys, and chat histories.
*   **Bring-Your-Own-Key (BYOK):** Users provide their own LLM API keys (Anthropic, OpenAI, Google, Mistral) securely managed via AES-256-GCM encryption. Zero LLM operating costs for the platform.
*   **Vector Search Grounding:** Custom, fast semantic vector search over uploaded documents leveraging `Float32Array` cosine similarity (with a clear migration path to `pgvector`).
*   **Streaming Chat with Citations:** Live, real-time message streaming tightly integrated with the Vercel AI SDK and precise document source citations.
*   **Advanced Control:** Complete manipulation of model temperatures, embedding chunk overlap/size, strict mode prompts, and similarity thresholds directly in the UI wizard.

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Authentication** | NextAuth v5 (Auth.js) / DB Sessions |
| **Database** | Prisma 7 + SQLite (Dev) -> Postgres (Prod) |
| **Styling** | Vanilla CSS Modules (No Tailwind) |
| **State Management** | Zustand (Client-side) |
| **UI Primitives** | shadcn/ui inspired (custom vanilla CSS implementations) |
| **AI Integration** | Vercel AI SDK v4.3.x (Pinned) |

## 🏗 Multi-Agent Build Architecture

Ragify was planned and architected via a strict, multi-agent AI framework to ensure impeccable security, typed contracts, and architectural consistency:
*   **Agent 1 (Architect)** - Project planning, file structures, schemas, risks.
*   **Agent 2 (Schema Engineer)** - Zod validations, Prisma schemas, Types, Crypto layer. 
*   **Agent 3 (Frontend Builder)** - React Components, Pages, layout shells, CSS Modules. 
*   **Agent 4 (API Engineer)** - Node.js routes, NextAuth config, rate limiting infrastructures.
*   **Agent 5 (Integration Specialist)** - Vercel AI SDK implementation & Mock modes.
*   **Agent 6 (QA Agent)** - Rigorous phase-gate checklist code audits. 

## 🔒 Security Principles

Security isn't an afterthought. The system ensures:
- **No plaintext API keys:** Provider API keys are AES-256-GCM encrypted with unique vectors. Platform keys are securely bcrypt/SHA-hashed.
- **Strict One-Way Type Interfaces:** Prevents circular dependencies by ensuring input types are strictly hand-written and mirrored against Prisma definitions, while Zod validators consume those bounds blindly. 
- **Type Safety Pipeline:** Validates all incoming API payloads before execution natively with zero `z.infer` usage within typed definitions.

## 🏃 Getting Started (Development)

Requires Node 20+.
```bash
# 1. Install dependencies
npm install

# 2. Push SQLite schema base
npx prisma db push --force-reset
npx prisma generate

# 3. Establish ENV vars
cp .env.example .env
# Populate ENCRYPTION_KEY using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Start Development Server
npm run dev
```

---

<details>
<summary><b>Appendix: What is RAG?</b></summary>

**Retrieval-Augmented Generation (RAG)** is an AI framework that improves the quality of Large Language Model (LLM) generated responses by grounding the model on external sources of knowledge.

Think of an LLM as a very smart student taking an open-book exam. Without RAG, the student is forced to take the exam from memory (the data they were trained on, which has a specific cut-off date and lacks your private data). **RAG gives the student access to the actual textbook (your precise data) while they are answering the questions.**

At its core, a RAG system operates in two distinct phases: 
1. **Data Ingestion:** Documents are parsed into discrete text chunks, embedded into multi-dimensional vectors using an embedding model, and stored in a vector database.
2. **Retrieval & Generation:** A user query is embedded into a vector, and similarity searches identify the most geometrically relevant text chunks. Those factual chunks are fed to the LLM alongside the query, generating highly specific, grounded, and hallucinatory-resistant results.
</details>

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessagesSchema } from "@/lib/validators";
import { decryptKey } from "@/lib/crypto";
import { retrieveContext } from "@/lib/retrieval";

import { ragStream, LlmError, type LlmErrorCode } from '@/lib/llm';
import { DEFAULT_EMBEDDING_MODEL } from '@/lib/models';

// Standard Next.js server runtime
export const runtime = "nodejs";
export const maxDuration = 30; // Max execution timeout extending Vercel limits properly for LLMs

function resolveProviderKey(
  userId: string, 
  providerApiKey: { encryptedKey: string, iv: string } | null, 
  provider: string
): { key: string, isFromPlatform: boolean } | null {
  if (providerApiKey) {
    try {
       const key = decryptKey(providerApiKey.encryptedKey, providerApiKey.iv);
       return { key, isFromPlatform: false };
    } catch(err) {
       console.error("Failed to decrypt BYOK", err);
    }
  }

  // Fallback map resolving internal workspace global configurations securely 
  const fallbackMap: Record<string, string | undefined> = {
    ANTHROPIC: process.env.ANTHROPIC_API_KEY,
    OPENAI: process.env.OPENAI_API_KEY,
    GOOGLE: process.env.GOOGLE_API_KEY,
    MISTRAL: process.env.MISTRAL_API_KEY,
  };

  const platformKey = fallbackMap[provider];
  if (platformKey) return { key: platformKey, isFromPlatform: true };
  
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Direct IDOR extraction explicitly securing the pipeline
    const rag = await db.rag.findUnique({
      where: { id },
    });

    if (!rag) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (rag.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const result = chatMessagesSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const messages = result.data.messages as Array<{role: string, content: string}>;
    const modelOverride = (json as any).model as string | undefined;
    const providerOverride = (json as any).provider as string | undefined;
    let conversationId = (json as any).conversationId as string | undefined;

    // Safely enforce dynamic Conversation container tracking internally if unmapped originally
    if (!conversationId) {
      const conv = await db.conversation.create({
        data: { ragId: id, userId: session.user.id }
      });
      conversationId = conv.id;
    }

    // Get the latest user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    let contextualSnippets = "";
    if (lastUserMessage) {
      const embeddingModel = rag.embeddingModel || DEFAULT_EMBEDDING_MODEL;
      const matchedChunks = await retrieveContext({
        ragId: id,
        query: lastUserMessage.content,
        topK: rag.topK,
        threshold: rag.threshold,
        embeddingModel,
      });

      // If both vector search and keyword fallback return nothing,
      // do NOT break the stream — instead inject a graceful note so the
      // model responds politely rather than hallucinating.
      if (matchedChunks.length === 0) {
        contextualSnippets = "\n\n[No matching document snippets were found for this query. Politely inform the user that you could not locate relevant information in the uploaded knowledge base, and suggest they rephrase or upload more documents.]";
      } else {
        contextualSnippets = "\n\nRetrieved Context:\n" + matchedChunks.map(c => `[Context Snippet]\n${c.content}`).join("\n\n");
      }
    }

    const readyDocs = await db.document.findMany({
      where: { ragId: id, status: 'READY' },
      select: { name: true }
    });
    const docNames = readyDocs.map(d => `"${d.name}"`).join(', ');

    let finalSystemPrompt = rag.systemPrompt 
      ? `You are ${rag.name}. ${rag.systemPrompt}` 
      : `You are ${rag.name}, an intelligent and helpful AI assistant powered by the Ragify platform.`;

    if (docNames) {
      finalSystemPrompt += `\n\nYou have access to the following documents in your knowledge base: ${docNames}.`;
    }
    
    // Safety strict injections appending parameters
    if (rag.strictMode) {
      finalSystemPrompt += "\n\nIMPORTANT: You must STRICTLY use only the provided context to answer the user's query. If the answer is not present in the context, explicitly state: 'I'm sorry, but that answer is not found in my knowledge base.' Do NOT hallucinate or make up information outside your documents.";
    }

    if (contextualSnippets) {
       finalSystemPrompt += contextualSnippets;
    }    // Rich Content Protocol — The Ragify Architect Prompt
    finalSystemPrompt += `
    \n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    RAGIFY ARCHITECT — RICH CONTENT PROTOCOL
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    You are a Senior Full-Stack Engineer specializing in interactive RAG interfaces.
    Deliver high-fidelity, interactive, and structurally sound rich content.
    Prioritize CODE RESILIENCE and MODULAR DELIVERY.
    OUTPUT STYLE: Zero prose. Deliver the block immediately. No explanations unless asked.
    
    ── STEP 1: ROUTE THE REQUEST ───────────────────────────────────────────────
    Before generating, classify and pick the EXACT tag:
    
    • Data / Metrics / Comparisons / Trends  →  \`\`\`chart   (JSON ChartSpec)
    • Flows / Architecture / Diagrams        →  \`\`\`diagram (JSON DiagramSpec)
    • Tabular / structured data              →  \`\`\`table   (CSV)
    • Dashboards / Custom UI / Interactive   →  \`\`\`html    (Full Document)
    • React Component Demo                   →  \`\`\`react   (JSX body)
    • Math / Equations                       →  $$ block / $ inline LaTeX
    
    ── BLOCK: \`\`\`chart ────────────────────────────────────────────────────────
    JSON ChartSpec schema:
    {
      "type": "bar" | "line" | "area" | "pie",
      "title": "Chart Title",
      "xKey": "fieldForXAxis",
      "yKeys": [{ "key": "field", "label": "Label", "color": "#6c63ff" }],
      "height": 300,
      "data": [{ "fieldForXAxis": "L1 Cache", "field": 4 }, ...]
    }
    Rules:
    - ALWAYS prefer \`\`\`chart for data comparisons. Never write raw canvas code.
    - "pie" type: yKeys needs exactly one entry; xKey is the label field.
    
    ── BLOCK: \`\`\`diagram ─────────────────────────────────────────────────────
    JSON DiagramSpec schema:
    {
      "direction": "TD" | "LR" | "BT" | "RL",
      "nodes": [{ "id": "oneWord", "label": "Free text, (parens), pipes | all fine",
                  "shape": "rect" | "round" | "diamond" | "cylinder" | "stadium" }],
      "edges": [{ "from": "nodeId", "to": "nodeId", "label": "optional",
                  "style": "-->" | "---" | "-.->" }],
      "groups": [{ "id": "groupId", "label": "Title", "contains": ["nodeId1"] }]
    }
    Rules:
    - "id" = single word, no spaces or special chars.
    - "label" = any free text, quotes/parens/pipes all handled by the renderer.
    - NEVER use \`\`\`mermaid. Always \`\`\`diagram with JSON.
    
    ── BLOCK: \`\`\`html — THE SELF-HEALING PROTOCOL ────────────────────────────
    The html block renders inside a sandboxed iframe. These rules are NON-NEGOTIABLE:
    
    STRUCTURE (Head-First Architecture):
    - ONE single \`\`\`html block. NEVER split into \`\`\`css or \`\`\`js blocks.
    - Start with \`<!DOCTYPE html>\`.
    - ALL CDN scripts and ALL \`<style>\` go in \`<head>\` FIRST.
      Reasoning: if the body is truncated, the layout/theme is already loaded.
    - ALL custom \`<script>\` logic goes at the END of \`<body>\`, just before \`</body>\`.
    - Mark the start of body content: \`<!-- MAIN_CONTENT_START -->\`
    
    DO NOT ADD:
    - window.onerror handlers  ← Ragify injects this automatically
    - height sync / postMessage scripts  ← Ragify injects this automatically
    - localStorage / sessionStorage (blocked by iframe sandbox)
    - External local files: href="style.css", src="app.js"
    
    CDN LIBRARIES (all allowed):
      Tailwind CSS  → \`<script src="https://cdn.tailwindcss.com"></script>\`  ← ALWAYS include
      Chart.js      → \`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\`
      D3.js         → \`<script src="https://d3js.org/d3.v7.min.js"></script>\`
      Plotly        → \`<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>\`
      Lucide Icons  → \`<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>\`
      Placeholder   → \`<img src="https://placehold.co/400x200">\` for image placeholders
    
    JAVASCRIPT SAFETY:
    - Wrap ALL complex logic in \`try { ... } catch(e) { console.warn(e); }\`
    - Use vanilla JS only. No external state libraries (Zustand, Redux, etc.)
    - Keep DOM structure SHALLOW. Avoid deep nesting (breaks on truncation).
    
    TRUNCATION-RESILIENT SYNTAX:
    - If nearing the token limit: PRIORITIZE CLOSING OPEN TAGS over adding more content.
    - Build in order of importance: layout shell → key data/charts → secondary features.
    - A complete skeleton with placeholder content is better than a rich but broken one.
    
    SCALE ACKNOWLEDGEMENT:
    If the request is too complex for one response, say:
    "This is a complex dashboard — delivering the core UI shell and primary logic first."
    Then deliver a 100% valid HTML skeleton with placeholder sections.
    
    CANONICAL EXAMPLE STRUCTURE:
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>/* component-specific overrides only */</style>
    </head>
    <body class="bg-gray-50 text-gray-900 p-6">
      <!-- MAIN_CONTENT_START -->
      <div id="app">
        <!-- layout here -->
      </div>
      <script>
        try {
          // all logic here
        } catch(e) { console.warn('[Ragify] Script error:', e); }
      </script>
    </body>
    </html>
    \`\`\`
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;


    // Effective provider from client override, or fallback to the rag default
    const effectiveProvider = (providerOverride || rag.provider) as string;

    // Retrieve Key securely decrypting AES mappings 
    const userApiKey = await db.userApiKey.findUnique({
       where: { userId_provider: { userId: session.user.id, provider: effectiveProvider } }
    });

    const isMockMode = process.env.MOCK_MODE === "true";

    // LOCAL provider (Ollama) needs no API key
    const isLocalProvider = effectiveProvider === 'LOCAL';

    const keyResolution = isMockMode
      ? { key: "mock-key", isFromPlatform: false }
      : isLocalProvider
        ? { key: "ollama", isFromPlatform: false }
        : resolveProviderKey(session.user.id, userApiKey, effectiveProvider);

    if (!keyResolution) {
      return NextResponse.json({ error: "no_api_key", provider: effectiveProvider }, { status: 402 });
    }

    const startTime = Date.now();
    const stream = await ragStream({
      messages,
      provider: effectiveProvider as import('@/lib/types').Provider,
      model: modelOverride || rag.model,
      apiKey: keyResolution.key,
      systemPrompt: finalSystemPrompt,
      temperature: rag.temperature,
      maxTokens: rag.maxTokens,
      topP: rag.topP,
      isMockMode,
      onFinish: async ({ usage, text }: { usage: any, text: string }) => {
         try {
            const responseTimeMs = Date.now() - startTime;
            
            if (lastUserMessage) {
              await db.message.create({
                data: {
                  conversationId: conversationId as string,
                  role: "USER",
                  content: lastUserMessage.content,
                }
              });
            }

            await db.message.create({
              data: {
                conversationId: conversationId as string,
                role: "ASSISTANT",
                content: text || "",
                tokenUsage: usage?.totalTokens || 0,
                responseTimeMs,
              }
            });
         } catch(e) {
           console.error("Failed to commit final stream DB tracking payload", e);
         }
      }
    });

    return stream.toDataStreamResponse({
      headers: {
        'x-conversation-id': conversationId as string
      }
    });

  } catch (error) {
    // Classified LLM errors — return structured responses to the client
    if (error instanceof LlmError) {
      const statusMap: Record<LlmErrorCode, number> = {
        INVALID_API_KEY:   402,
        CREDITS_EXHAUSTED: 402,
        MODEL_NOT_FOUND:   422,
        RATE_LIMIT:        429,
        CONTEXT_OVERFLOW:  413,
        PROVIDER_ERROR:    502,
      };
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: statusMap[error.code] }
      );
    }

    console.error(`[CHAT_STREAM_ERROR] [RagId: ${params.id}]`, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

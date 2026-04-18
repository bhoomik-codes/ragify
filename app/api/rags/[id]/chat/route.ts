import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatMessagesSchema } from "@/lib/validators";
import { decryptKey } from "@/lib/crypto";

import { ragStream, LlmError, type LlmErrorCode } from '@/lib/llm';

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
      // Keyword-based retrieval fallback (used until real embeddings are wired)
      const queryKeywords = lastUserMessage.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);

      const chunks = await db.chunk.findMany({
        where: {
          document: {
            ragId: id,
            status: 'READY',
          },
          OR: queryKeywords.length > 0
            ? queryKeywords.map(kw => ({ content: { contains: kw } }))
            : undefined,
        },
        take: rag.topK,
        orderBy: { index: 'asc' },
      });
      
      if (chunks.length > 0) {
        contextualSnippets = "\n\nRetrieved Context:\n" + chunks.map(c => `[Context Snippet]\n${c.content}`).join("\n\n");
      }
    }

    let finalSystemPrompt = rag.systemPrompt 
      ? `You are ${rag.name}. ${rag.systemPrompt}` 
      : `You are ${rag.name}, an intelligent and helpful AI assistant powered by the Ragify platform.`;
    
    // Safety strict injections appending parameters
    if (rag.strictMode) {
      finalSystemPrompt += "\n\nIMPORTANT: You must STRICTLY use only the provided context to answer the user's query. If the answer is not present in the context, explicitly state: 'I'm sorry, but that answer is not found in my knowledge base.' Do NOT hallucinate or make up information outside your documents.";
    }

    if (contextualSnippets) {
       finalSystemPrompt += contextualSnippets;
    }

    // Retrieve Key securely decrypting AES mappings 
    const userApiKey = await db.userApiKey.findUnique({
       where: { userId_provider: { userId: session.user.id, provider: rag.provider } }
    });

    const isMockMode = process.env.MOCK_MODE === "true";

    const keyResolution = isMockMode
      ? { key: "mock-key", isFromPlatform: false }
      : resolveProviderKey(session.user.id, userApiKey, rag.provider);

    if (!keyResolution) {
      return NextResponse.json({ error: "no_api_key", provider: rag.provider }, { status: 402 });
    }

    const startTime = Date.now();
    const stream = await ragStream({
      messages,
      provider: rag.provider as import('@/lib/types').Provider,
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

    return stream.toDataStreamResponse();

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

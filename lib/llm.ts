import { streamText, type LanguageModelV1, type CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { Provider } from './types';
import { withRetry } from './retry';

export type LlmErrorCode =
  | 'INVALID_API_KEY'
  | 'CREDITS_EXHAUSTED'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'CONTEXT_OVERFLOW'
  | 'PROVIDER_ERROR';

export class LlmError extends Error {
  constructor(public code: LlmErrorCode, message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

/**
 * Error codes that indicate a transient condition the caller can safely retry.
 * Everything else (invalid key, exhausted credits, wrong model, context overflow)
 * is a permanent client-side error — retrying wastes time and quota.
 */
const RETRYABLE_CODES = new Set<LlmErrorCode>([
  'RATE_LIMIT',
  'PROVIDER_ERROR',
]);

function classifyProviderError(err: unknown): LlmError {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  if (msg.includes('invalid_api_key') || msg.includes('authentication') || msg.includes('401') || msg.includes('incorrect api key')) {
    return new LlmError('INVALID_API_KEY', 'The API key provided is invalid or has been revoked.');
  }
  if (msg.includes('insufficient_quota') || msg.includes('credit') || msg.includes('billing') || msg.includes('exceeded your current quota')) {
    return new LlmError('CREDITS_EXHAUSTED', 'Your API credits are exhausted. Please top up your account.');
  }
  if (msg.includes('model_not_found') || msg.includes('does not exist') || msg.includes('no such model') || msg.includes('invalid model')) {
    return new LlmError('MODEL_NOT_FOUND', 'The selected model does not exist or is not available with your API key.');
  }
  if (msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return new LlmError('RATE_LIMIT', 'Provider rate limit hit. Please wait a moment and try again.');
  }
  if (msg.includes('context') || msg.includes('token') && msg.includes('exceed') || msg.includes('maximum context')) {
    return new LlmError('CONTEXT_OVERFLOW', "The conversation is too long for this model's context window.");
  }

  return new LlmError('PROVIDER_ERROR', `The AI provider returned an error: ${err instanceof Error ? err.message : 'Unknown error'}`);
}

export interface RagStreamParams {
  messages: Array<{ role: string; content: string }>;
  provider: Provider;
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  isMockMode: boolean; // Indicates if you should bypass external routing and return a simulated echo stream
  
  // Usage tracking callback explicitly natively handling completion logging
  onFinish?: (event: { usage: any; text: string }) => Promise<void>; 
}

export async function ragStream(params: RagStreamParams) {
  const {
    messages,
    provider,
    model,
    apiKey,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    isMockMode,
    onFinish
  } = params;

  let modelInstance: LanguageModelV1;

  if (isMockMode || !apiKey) {
    modelInstance = {
      specificationVersion: 'v1',
      provider: 'mock-provider',
      modelId: 'mock-model',
      defaultObjectGenerationMode: 'json',
      async doGenerate() {
        return {
          text: "This is a simulated mock response because mock mode is active.",
          usage: { promptTokens: 0, completionTokens: 10 },
          finishReason: 'stop',
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      },
      async doStream() {
        return {
          stream: new ReadableStream({
            start(controller) {
              const text = "This is a simulated stream response because mock mode is active or no API key was provided.";
              const words = text.split(" ");
              let i = 0;
              const interval = setInterval(() => {
                if (i < words.length) {
                  controller.enqueue({ type: 'text-delta', textDelta: words[i] + (i === words.length - 1 ? '' : ' ') });
                  i++;
                } else {
                  clearInterval(interval);
                  controller.enqueue({
                    type: 'finish',
                    finishReason: 'stop',
                    usage: { promptTokens: 10, completionTokens: 10 },
                  });
                  controller.close();
                }
              }, 50);
            }
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      }
    };
  } else {
    switch (provider) {
      case Provider.ANTHROPIC: {
        const anthropic = createAnthropic({ apiKey });
        modelInstance = anthropic(model);
        break;
      }
      case Provider.GOOGLE: {
        const google = createGoogleGenerativeAI({ apiKey });
        modelInstance = google(model);
        break;
      }
      case Provider.MISTRAL: {
        const mistral = createMistral({ apiKey });
        modelInstance = mistral(model);
        break;
      }
      case Provider.LOCAL: {
        // Ollama exposes an OpenAI-compatible API at /v1
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const ollama = createOpenAI({
          baseURL: `${ollamaBaseUrl}/v1`,
          apiKey: 'ollama', // Ollama requires no real key, but the SDK needs a non-empty string
        });
        modelInstance = ollama(model);
        break;
      }
      case Provider.OPENAI:
      default: {
        const openai = createOpenAI({ apiKey });
        modelInstance = openai(model);
        break;
      }
    }
  }

  // Use Vercel AI SDK to stream — wrapped with exponential-backoff retry for
  // transient errors (RATE_LIMIT, PROVIDER_ERROR). Non-retryable errors
  // (bad key, exhausted credits, wrong model, context too long) propagate immediately.
  try {
    const result = await withRetry(
      async () =>
        streamText({
          model: modelInstance,
          system: systemPrompt,
          messages: messages as CoreMessage[],
          temperature,
          maxTokens,
          topP,
          onFinish,
        }),
      {
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs:  8_000,
        retryOn: (err) => {
          // Only classify and retry transient provider errors.
          // Unknown errors (network blips) are also retried.
          const classified = classifyProviderError(err);
          return RETRYABLE_CODES.has(classified.code);
        },
        onRetry: (err, attempt, delayMs) => {
          const classified = classifyProviderError(err);
          console.warn(
            `[LLM] Transient error "${classified.code}" on attempt ${attempt}. ` +
            `Retrying in ${Math.round(delayMs)}ms…`
          );
        },
      },
    );

    return result;
  } catch (err) {
    throw classifyProviderError(err);
  }
}

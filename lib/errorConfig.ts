import { LlmErrorCode } from './llm';

export const ERROR_CONFIG: Record<LlmErrorCode | 'default', { icon: string; title: string; hint: string; color: string; }> = {
  INVALID_API_KEY:   { icon: '🔑', title: 'Invalid API Key',       hint: 'Your API key is incorrect or revoked. Update it in Settings → Provider Keys.',   color: '#f59e0b' },
  CREDITS_EXHAUSTED: { icon: '💳', title: 'Credits Exhausted',     hint: 'Your API account is out of credits. Top up your balance with your provider.',     color: '#ef4444' },
  MODEL_NOT_FOUND:   { icon: '🤖', title: 'Model Not Available',   hint: "This model doesn't exist or isn't accessible with your key. Pick another above.", color: '#8b5cf6' },
  RATE_LIMIT:        { icon: '⏱️', title: 'Rate Limit Reached',    hint: 'Too many requests. Wait a moment and try again.',                                  color: '#f97316' },
  CONTEXT_OVERFLOW:  { icon: '📚', title: 'Context Too Long',      hint: 'The document or chat is too large for this model to handle.',                     color: '#3b82f6' },
  PROVIDER_ERROR:    { icon: '🔌', title: 'Provider Down',         hint: 'The AI service is currently experiencing issues. Try another provider.',          color: '#ef4444' },
  default:           { icon: '⚠️', title: 'Generation Failed',     hint: 'An unexpected error occurred while generating the response.',                     color: '#ef4444' },
};

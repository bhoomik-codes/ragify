export const MODEL_REGISTRY: Record<string, { label: string; models: string[] }> = {
  OPENAI: { label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  ANTHROPIC: { label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  GOOGLE: { label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  MISTRAL: { label: 'Mistral', models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b'] },
  LOCAL: {
    label: '🖥️ Local (Ollama)',
    models: [
      // --- Daily Drivers (Fast & Reliable) ---
      'llama3.2',
      'mistral:latest',
      'gemma3:4b',

      // --- Coding & Development ---
      'codellama',
      'qwen3:8b', // Great at understanding code logic

      // --- Smart Reasoning ---
      'deepseek-r1:7b', // Use this for complex math/logic

      // --- The Limit (Might be slow) ---
      'phi4:14b'
    ]
  },
};

export const EMBEDDING_REGISTRY = [
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small (OpenAI)' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large (OpenAI)' },
  { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002 (OpenAI)' },
  { value: 'qwen3-embedding', label: 'qwen3-embedding (Local/Ollama)' },
  { value: 'nomic-embed-text', label: 'nomic-embed-text (Local/Ollama)' },
  { value: 'mxbai-embed-large', label: 'mxbai-embed-large (Local/Ollama)' },
];

export const DEFAULT_EMBEDDING_MODEL = 'qwen3-embedding';

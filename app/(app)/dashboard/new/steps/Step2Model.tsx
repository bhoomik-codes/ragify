'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';
import { Provider } from '../../../../../lib/types';

const MODEL_REGISTRY: Record<string, { label: string; models: string[] }> = {
  OPENAI:    { label: 'OpenAI',        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  ANTHROPIC: { label: 'Anthropic',     models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  GOOGLE:    { label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  MISTRAL:   { label: 'Mistral',       models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b'] },
  LOCAL:     { label: '🖥️ Local (Ollama)', models: ['llama3.3', 'qwen3:8b', 'qwen3:32b', 'gemma3:4b', 'gemma3:27b', 'deepseek-r1:14b', 'phi4:14b', 'codellama'] },
};

export function Step2Model() {
  const { data, updateData } = useWizardStore();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Model configuration</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Provider</label>
          <select 
            value={data.provider}
            onChange={(e) => {
              const newProvider = e.target.value as Provider;
              const newModel = MODEL_REGISTRY[newProvider]?.models[0] || '';
              updateData({ provider: newProvider, model: newModel });
            }}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
          >
            {Object.values(Provider).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Model</label>
          <select 
            value={data.model}
            onChange={(e) => updateData({ model: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
          >
            {MODEL_REGISTRY[data.provider as keyof typeof MODEL_REGISTRY]?.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Temperature" 
              type="number" 
              step="0.1"
              value={data.temperature}
              onChange={(e) => updateData({ temperature: parseFloat(e.target.value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input 
              label="Max Tokens" 
              type="number" 
              value={data.maxTokens}
              onChange={(e) => updateData({ maxTokens: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>System Prompt</label>
          <textarea 
            value={data.systemPrompt}
            onChange={(e) => updateData({ systemPrompt: e.target.value })}
            style={{ padding: '12px', minHeight: '100px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'inherit' }}
            placeholder="You are a strict technical assistant..."
          />
        </div>
      </div>
    </div>
  );
}

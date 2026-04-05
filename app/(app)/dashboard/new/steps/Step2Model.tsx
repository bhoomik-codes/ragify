'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';
import { Provider } from '../../../../../lib/types';

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
            onChange={(e) => updateData({ provider: e.target.value as Provider })}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
          >
            {Object.values(Provider).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <Input 
          label="Model" 
          placeholder="gpt-4-turbo" 
          value={data.model}
          onChange={(e) => updateData({ model: e.target.value })}
        />

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

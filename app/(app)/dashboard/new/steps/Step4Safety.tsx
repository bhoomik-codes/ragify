'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';

export function Step4Safety() {
  const { data, updateData } = useWizardStore();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Safety & Limits</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Max Turns per Conversation" 
              type="number" 
              value={data.maxTurns}
              onChange={(e) => updateData({ maxTurns: parseInt(e.target.value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input 
              label="Rate Limit (req/day)" 
              type="number" 
              value={data.rateLimit}
              onChange={(e) => updateData({ rateLimit: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Filter Level</label>
            <select 
              value={data.filterLevel}
              onChange={(e) => updateData({ filterLevel: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Citation Mode</label>
            <select 
              value={data.citationMode}
              onChange={(e) => updateData({ citationMode: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}
            >
              <option value="INLINE">Inline</option>
              <option value="FOOTNOTE">Footnote</option>
              <option value="NONE">None</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

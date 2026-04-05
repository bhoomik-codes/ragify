'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';

export function Step1Basic() {
  const { data, updateData } = useWizardStore();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Basic Information</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          label="Pipeline Name" 
          placeholder="e.g. Acme DocBot" 
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
        <Input 
          label="Description" 
          placeholder="Optional description" 
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
        />
        <Input 
          label="Emoji Icon" 
          placeholder="🤖" 
          value={data.emoji}
          onChange={(e) => updateData({ emoji: e.target.value })}
        />
        <Input 
          label="Tags (comma separated)" 
          placeholder="sales, support" 
          value={data.tags.join(', ')}
          onChange={(e) => updateData({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        />
      </div>
    </div>
  );
}

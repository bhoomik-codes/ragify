'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';

export function Step3Retrieval() {
  const { data, updateData } = useWizardStore();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Retrieval Settings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <Input 
          label="Embedding Model" 
          placeholder="text-embedding-3-small" 
          value={data.embeddingModel}
          onChange={(e) => updateData({ embeddingModel: e.target.value })}
        />

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Chunk Size" 
              type="number" 
              value={data.chunkSize}
              onChange={(e) => updateData({ chunkSize: parseInt(e.target.value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input 
              label="Chunk Overlap" 
              type="number" 
              value={data.chunkOverlap}
              onChange={(e) => updateData({ chunkOverlap: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              label="Top K" 
              type="number" 
              value={data.topK}
              onChange={(e) => updateData({ topK: parseInt(e.target.value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input 
              label="Similarity Threshold" 
              type="number" 
              step="0.05"
              value={data.threshold}
              onChange={(e) => updateData({ threshold: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

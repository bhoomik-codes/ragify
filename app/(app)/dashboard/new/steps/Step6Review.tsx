'use client';

import React from 'react';
import { useWizardStore } from '../wizardStore';

export function Step6Review() {
  const { data } = useWizardStore();

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Review Configuration</h2>
      
      <div style={{ 
        padding: '16px', 
        backgroundColor: 'var(--bg)', 
        borderRadius: 'var(--radius)', 
        border: '1px solid var(--border)',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <pre style={{ fontSize: '0.8125rem', color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Double check your settings above. If everything looks good, click Create RAG to persist this pipeline.
      </p>
    </div>
  );
}

import React from 'react';
import { WizardForm } from './WizardForm';

export default function NewRagPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '48px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '1.75rem', color: 'var(--text)' }}>Create a New RAG Pipeline</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Configure your LLM model, retrieval settings, and upload initial documents.</p>
      <WizardForm />
    </div>
  );
}

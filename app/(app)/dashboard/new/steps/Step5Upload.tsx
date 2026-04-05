'use client';

import React, { useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { Button } from '../../../../../components/ui/Button';

export function Step5Upload() {
  const { data, updateData } = useWizardStore();
  const [mockAdding, setMockAdding] = useState(false);

  const handleMockUpload = () => {
    setMockAdding(true);
    setTimeout(() => {
      // Generate a mock CUID string that passes Zod's target shape
      const mockCuid = 'cl' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      updateData({ documentIds: [...data.documentIds, mockCuid] });
      setMockAdding(false);
    }, 600);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text)' }}>Initial Documents</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>Upload initial files to bootstrap your RAG. Actual S3 pipeline injected in Phase 3.</p>
      
      <div style={{ 
        border: '2px dashed var(--border)', 
        borderRadius: 'var(--radius)', 
        padding: '48px 24px', 
        textAlign: 'center',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)'
      }}>
        <div style={{ marginBottom: '16px' }}>Drag & Drop files here, or click to browse</div>
        <Button variant="secondary" onClick={handleMockUpload} loading={mockAdding}>
          Mock File Upload (Inject dummy CUID)
        </Button>
      </div>

      {data.documentIds.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ marginBottom: '8px', color: 'var(--text)' }}>Uploaded Documents:</h4>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {data.documentIds.map(id => (
               <li key={id}>{id} (mocked)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

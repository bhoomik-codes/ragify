'use client';

import React, { useState } from 'react';
import { useWizardStore } from './wizardStore';
import { Step1Basic } from './steps/Step1Basic';
import { Step2Model } from './steps/Step2Model';
import { Step3Retrieval } from './steps/Step3Retrieval';
import { Step4Safety } from './steps/Step4Safety';
import { Step5Upload } from './steps/Step5Upload';
import { Step6Review } from './steps/Step6Review';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { useRouter } from 'next/navigation';
import { PipelineStatus } from '../../../../components/ui/PipelineStatus/PipelineStatus';

export function WizardForm({ isEdit = false, ragId = null }: { isEdit?: boolean, ragId?: string | null }) {
  const { step, nextStep, prevStep, data, reset, files, setFiles } = useWizardStore();
  const router = useRouter();
  const [submissionPhase, setSubmissionPhase] = useState<'IDLE' | 'CREATING_RAG' | 'UPLOADING' | 'DONE'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmissionPhase('CREATING_RAG');
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/rags/${ragId}` : '/api/rags', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
         if (res.status === 429) {
           setError('Too many requests. Please try again later.');
           setSubmissionPhase('IDLE');
           return;
         }
         console.warn('POST /api/rags failed', await res.text());
         setError('Failed to create RAG. Please try again.');
         setSubmissionPhase('IDLE');
         return;
      }
      
      const createdRag = await res.json();
      
      if (files.length === 0) {
         reset();
         router.refresh();
         router.push('/dashboard');
         return;
      }

      setSubmissionPhase('UPLOADING');
      
      for (const f of files) {
         setFiles(prev => prev.map(old => old.id === f.id ? { ...old, status: 'UPLOADING' } : old));
         const formData = new FormData();
         formData.append('ragId', createdRag.id);
         formData.append('file', f.file);

         const uploadRes = await fetch('/api/documents/upload', {
           method: 'POST',
           body: formData
         });

         if (uploadRes.ok) {
           const json = await uploadRes.json();
           setFiles(prev => prev.map(old => old.id === f.id ? { ...old, status: json.status, documentId: json.documentId } : old));
         } else {
           setFiles(prev => prev.map(old => old.id === f.id ? { ...old, status: 'FAILED', error: 'Upload failed' } : old));
         }
      }

    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred.');
      setSubmissionPhase('IDLE');
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: return <Step1Basic />;
      case 2: return <Step2Model />;
      case 3: return <Step3Retrieval />;
      case 4: return <Step4Safety />;
      case 5: return <Step5Upload />;
      case 6: return <Step6Review />;
      default: return null;
    }
  };

  if (submissionPhase === 'UPLOADING' || submissionPhase === 'DONE') {
     return (
       <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
         <h2 style={{fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text)'}}>Initializing RAG Pipeline</h2>
         <p style={{color: 'var(--text-muted)', marginBottom: '32px'}}>Your RAG has been created! We are now securely uploading and indexing your documents.</p>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            {files.map(f => (
               <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.875rem' }}>{f.file.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {f.status === 'FAILED' ? <span style={{color: '#ef4444'}}>Failed</span> : 
                       f.status === 'UPLOADING' ? 'Uploading...' : 
                       f.status === 'READY' ? <span style={{color: '#10B981'}}>Uploaded</span> : 'Processing...'}
                    </span>
                  </div>
                  
                  {f.documentId && (
                     <PipelineStatus documentId={f.documentId} onComplete={() => setFiles(prev => prev.map(old => old.id === f.id ? { ...old, status: 'READY' } : old))} />
                  )}
               </div>
            ))}
         </div>

         <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
               variant="primary" 
               onClick={() => { reset(); router.refresh(); router.push('/dashboard'); }}
               disabled={files.some(f => f.status === 'UPLOADING' || f.status === 'QUEUED' || f.status === 'PROCESSING' || f.status === 'PENDING')}
            >
               Go to Dashboard
            </Button>
         </div>
       </Card>
     );
  }

  return (
    <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1,2,3,4,5,6].map(s => (
          <div 
            key={s} 
            style={{ 
              flex: 1, 
              height: '4px', 
              backgroundColor: s <= step ? 'var(--accent)' : 'var(--border)',
              borderRadius: '2px',
              transition: 'background-color 0.3s ease'
            }} 
          />
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px', marginBottom: '24px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1 }}>
        {renderStep()}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
        {step > 1 ? (
          <Button variant="secondary" onClick={prevStep} disabled={submissionPhase === 'CREATING_RAG'}>Back</Button>
        ) : (
          <div /> 
        )}
        
        {step < 6 ? (
          <Button variant="primary" onClick={nextStep}>Continue</Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit} loading={submissionPhase === 'CREATING_RAG'}>Create RAG</Button>
        )}
      </div>
    </Card>
  );
}

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

export function WizardForm() {
  const { step, nextStep, prevStep, data, reset } = useWizardStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/rags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
         reset();
         router.push('/dashboard');
      } else {
         if (res.status === 429) {
           setError('Too many requests. Please try again later.');
           return;
         }
         console.warn('POST /api/rags mock failed', await res.text());
         setError('Failed to create RAG. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
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
          <Button variant="secondary" onClick={prevStep} disabled={isSubmitting}>Back</Button>
        ) : (
          <div /> 
        )}
        
        {step < 6 ? (
          <Button variant="primary" onClick={nextStep}>Continue</Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>Create RAG</Button>
        )}
      </div>
    </Card>
  );
}

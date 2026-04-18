'use client';

import React, { useState, useEffect } from 'react';
import styles from './PipelineStatus.module.css';

interface PipelineStatusProps {
  documentId: string;
  onComplete?: () => void;
}

export function PipelineStatus({ documentId, onComplete }: PipelineStatusProps) {
  const [status, setStatus] = useState<'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'>('QUEUED');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'READY' || status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          if (data.status === 'READY') {
            onComplete?.();
          }
        } else {
          setError('Failed to fetch status');
          setStatus('FAILED');
        }
      } catch (err) {
        setError('Network error');
        setStatus('FAILED');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documentId, status, onComplete]);

  let activeIndex = 0;
  if (status === 'PROCESSING') activeIndex = 1;
  if (status === 'READY') activeIndex = 3;

  const STAGES = [
    'Parsing',
    'Chunking',
    'Embedding',
    'Ready'
  ];

  return (
    <div className={styles.container}>
      {status === 'FAILED' ? (
        <div className={styles.errorText}>Pipeline Failed: {error || 'Processing error'}</div>
      ) : (
        <div className={styles.stepperRow}>
          {STAGES.map((stage, i) => {
             const isComplete = i < activeIndex || status === 'READY';
             const isActive = i === activeIndex && status !== 'READY';
             const isPending = i > activeIndex;

             return (
               <div key={stage} className={`${styles.step} ${isActive ? styles.active : ''} ${isComplete ? styles.complete : ''} ${isPending ? styles.pending : ''}`}>
                 <div className={styles.indicatorWrapper}>
                   <div className={styles.indicator}></div>
                   {isActive && <div className={styles.pulse} />}
                 </div>
                 <span className={styles.stageText}>{stage}</span>
                 {i < STAGES.length - 1 && <div className={`${styles.line} ${isComplete ? styles.lineComplete : ''}`} />}
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}

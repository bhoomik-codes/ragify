'use client';

import React, { useState, useEffect } from 'react';
import styles from './PipelineStatus.module.css';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

const STAGES = [
  'Parsing Document',
  'Chunking Content',
  'Embedding Vectors',
  'Ready'
];

export function PipelineStatus() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Mock timed component moving through ingestion
  useEffect(() => {
    if (currentStageIndex < STAGES.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStageIndex(i => i + 1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStageIndex]);

  return (
    <div className={styles.pipelineContainer}>
      <h3 className={styles.title}>Ingestion Status</h3>
      <div className={styles.stagesList}>
        {STAGES.map((stage, i) => {
          const isComplete = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          const isPending = i > currentStageIndex;
          
          return (
            <div key={stage} className={`${styles.stageRow} ${isCurrent ? styles.active : ''} ${isPending ? styles.pending : ''}`}>
               <div className={styles.iconWrapper}>
                 {isComplete ? <CheckCircle size={18} className={styles.iconComplete} /> 
                  : isCurrent ? <Loader2 size={18} className={styles.iconSpin} /> 
                  : <Circle size={18} className={styles.iconPending} />}
               </div>
               <span className={styles.stageName}>{stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

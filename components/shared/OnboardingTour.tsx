'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { OnboardingTourProps } from '../../lib/types';
import styles from './OnboardingTour.module.css';
import { useRouter } from 'next/navigation';

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onboardingDone }) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Show if not done
  useEffect(() => {
    if (!onboardingDone) {
      setOpen(true);
    }
  }, [onboardingDone]);

  const handleComplete = async () => {
    // Optimistic close
    setOpen(false);
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingDone: true })
      });
      router.refresh();
    } catch (err) {
      console.error('Failed to update onboarding state', err);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Welcome to Ragify! 🚀">
      <div className={styles.content}>
        <div className={styles.step}>
          <div className={styles.icon}>1</div>
          <p>Create a RAG pipeline by connecting your data and configuring your preferred LLM.</p>
        </div>
        <div className={styles.step}>
          <div className={styles.icon}>2</div>
          <p>Upload your PDFs or text documents. We securely chunk and embed them.</p>
        </div>
        <div className={styles.step}>
          <div className={styles.icon}>3</div>
          <p>Start chatting with your documents or connect via API instantly.</p>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={handleComplete}>
            Get Started
          </Button>
        </div>
      </div>
    </Modal>
  );
};

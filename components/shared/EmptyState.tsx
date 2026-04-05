'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import type { EmptyStateProps } from '../../lib/types';
import styles from './EmptyState.module.css';

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  ctaText,
  onCtaClick,
  ctaHref,
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (ctaHref) {
      router.push(ctaHref);
    } else if (onCtaClick) {
      onCtaClick();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.illustration}>
        <svg viewBox="0 0 200 150" fill="none" className={styles.svg}>
          <rect x="50" y="30" width="100" height="90" rx="8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" />
          <circle cx="100" cy="75" r="15" fill="currentColor" opacity="0.2" />
          <path d="M70 75 L90 75 M110 75 L130 75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {ctaText && (
        <div className={styles.actions}>
          <Button onClick={handleClick}>{ctaText}</Button>
        </div>
      )}
    </div>
  );
};

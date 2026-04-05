import React from 'react';
import { Card } from '../ui/Card';
import type { SkeletonCardProps } from '../../lib/types';
import styles from './SkeletonCard.module.css';

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <Card padding="md" className={`${styles.skeleton} ${className || ''}`}>
      <div className={styles.header}>
        <div className={styles.circle} />
        <div className={styles.title} />
      </div>
      <div className={styles.body}>
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.shortLine} />
      </div>
      <div className={styles.footer}>
        <div className={styles.badge} />
        <div className={styles.badge} />
      </div>
    </Card>
  );
};

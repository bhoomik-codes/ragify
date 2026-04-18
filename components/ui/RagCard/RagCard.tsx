import React from 'react';
import Link from 'next/link';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { StatusBadge } from '../../shared/StatusBadge';
import type { RagDto } from '../../../lib/types';
import styles from './RagCard.module.css';

export function RagCard({ rag }: { rag: RagDto }) {
  return (
    <Link href={`/rags/${rag.id}/chat`} className={styles.link}>
      <Card className={styles.card} padding="lg">
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <span className={styles.emoji}>{rag.emoji || '🤖'}</span>
            <h3 className={styles.name}>{rag.name}</h3>
          </div>
          <StatusBadge status={rag.status} />
        </div>

        <p className={styles.description}>
          {rag.description || 'No description provided.'}
        </p>

        <div className={styles.footer}>
          <div className={styles.tags}>
            {rag.tags && rag.tags.length > 0 ? (
              rag.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="neutral">{tag}</Badge>
              ))
            ) : (
              <span className={styles.noTags}>No tags</span>
            )}
            {rag.tags && rag.tags.length > 3 && (
              <Badge variant="neutral">+{rag.tags.length - 3}</Badge>
            )}
          </div>
          <span className={styles.configInfo}>{rag.model}</span>
        </div>
      </Card>
    </Link>
  );
}

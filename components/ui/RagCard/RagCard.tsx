import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { StatusBadge } from '../../shared/StatusBadge';
import type { RagDto } from '../../../lib/types';
import styles from './RagCard.module.css';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

export function RagCard({ rag }: { rag: RagDto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this RAG bot?')) return;
    try {
      await fetch(`/api/rags/${rag.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Link href={`/rags/${rag.id}/chat`} className={styles.link}>
      <Card className={styles.card} padding="lg">
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <span className={styles.emoji}>{rag.emoji || '🤖'}</span>
            <h3 className={styles.name}>{rag.name}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <StatusBadge status={rag.status} />
            <button 
              onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div 
                style={{ 
                  position: 'absolute', top: '100%', right: 0, zIndex: 10, marginTop: '4px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: '120px'
                }}
              >
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: -1 }} 
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); }} 
                />
                <button
                  onClick={(e) => { e.preventDefault(); router.push(`/dashboard/edit/${rag.id}`); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: '0.875rem' }}
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontSize: '0.875rem' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
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

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { StatusBadge } from '../../shared/StatusBadge';
import type { RagDto } from '../../../lib/types';
import styles from './RagCard.module.css';
import { MoreVertical, Edit2, Trash2, Share2, Link as LinkIcon } from 'lucide-react';

export function RagCard({ rag }: { rag: RagDto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const password = window.prompt(
        "Optional: set a password for this share link (min 8 chars). Leave blank for no password.",
        "",
      );
      const body: any = {};
      if (password && password.length > 0) body.password = password;

      const res = await fetch(`/api/rags/${rag.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create share link");

      const url = `${window.location.origin}/share/${json.token}`;
      try {
        await navigator.clipboard.writeText(url);
        alert("Share link copied to clipboard.");
      } catch {
        window.prompt("Copy your share link:", url);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setMenuOpen(false);
    }
  };

  const handleRevokeShares = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Revoke ALL share links for this RAG?")) return;
    try {
      const res = await fetch(`/api/rags/${rag.id}/share`);
      const links = await res.json();
      if (!res.ok) throw new Error(links?.error ?? "Failed to load share links");
      await Promise.all(
        (links as Array<{ id: string }>).map((l) =>
          fetch(`/api/rags/${rag.id}/share/${l.id}`, { method: "DELETE" }),
        ),
      );
      alert("Share links revoked.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to revoke share links");
    } finally {
      setMenuOpen(false);
    }
  };

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
                  onClick={handleShare}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: '0.875rem' }}
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  onClick={handleRevokeShares}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: '0.875rem' }}
                >
                  <LinkIcon size={14} /> Revoke Links
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

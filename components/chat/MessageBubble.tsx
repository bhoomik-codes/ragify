'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RichRenderer } from './RichRenderer';
import { Check, Copy, Edit2, RefreshCw, Trash2 } from 'lucide-react';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  index?: number;
  onRetry?: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

export function MessageBubble({ id, role, content, isStreaming = false, index = 0, onRetry, onEdit, onDelete }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(content);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (!isHovered || !onDelete) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Delete') {
        e.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, onDelete]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (onEdit && editValue.trim() !== content) {
      onEdit(editValue);
    }
  };

  return (
    <motion.div
      className={isUser ? styles.userWrapper : styles.assistantWrapper}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.04, 0.2) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar + Bubble in a horizontal row */}
      <div className={styles.bubbleRow}>
        {!isUser && (
          <div className={styles.avatar} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
        )}
        <div className={`${isUser ? styles.userBubble : styles.assistantBubble} ${isStreaming ? styles.streaming : ''}`}>
          {isEditing ? (
            <div className={styles.editMode}>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className={styles.editTextarea}
                rows={3}
              />
              <div className={styles.editActions}>
                <button onClick={() => setIsEditing(false)} className={styles.editCancel}>Cancel</button>
                <button onClick={handleSaveEdit} className={styles.editSave}>Save &amp; Resend</button>
              </div>
            </div>
          ) : isUser ? (
            <p className={styles.userText}>{content}</p>
          ) : (
            <RichRenderer content={content} />
          )}
        </div>
      </div>

      {/* Action buttons — shown on hover via CSS */}
      {!isStreaming && (
        <div className={styles.actionRow}>
          {copied ? (
            <button className={styles.actionBtn} title="Copied"><Check size={14} /></button>
          ) : (
            <button className={styles.actionBtn} onClick={handleCopy} title="Copy message"><Copy size={14} /></button>
          )}
          {isUser && onEdit && (
            <button className={styles.actionBtn} onClick={() => setIsEditing(true)} title="Edit message"><Edit2 size={14} /></button>
          )}
          {!isUser && onRetry && (
            <button className={styles.actionBtn} onClick={onRetry} title="Regenerate response"><RefreshCw size={14} /></button>
          )}
          {onDelete && (
            <button className={styles.actionBtn} onClick={onDelete} title="Delete message (Shift+Del)"><Trash2 size={14} /></button>
          )}
        </div>
      )}
    </motion.div>
  );
}

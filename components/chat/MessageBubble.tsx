'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RichRenderer } from './RichRenderer';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  index?: number;
}

export function MessageBubble({ role, content, isStreaming = false, index = 0 }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      className={isUser ? styles.userWrapper : styles.assistantWrapper}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.04, 0.2) }}
    >
      {!isUser && (
        <div className={styles.avatar} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
      )}
      <div className={`${isUser ? styles.userBubble : styles.assistantBubble} ${isStreaming ? styles.streaming : ''}`}>
        {isUser ? (
          <p className={styles.userText}>{content}</p>
        ) : (
          <RichRenderer content={content} />
        )}
      </div>
    </motion.div>
  );
}

'use client';

import React from 'react';
import styles from './ProfilePage.module.css';

interface ActivityData {
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  lastRag: { name: string; createdAt: Date } | null;
  lastDoc: { name: string; createdAt: Date } | null;
  lastMsg: {
    content: string;
    createdAt: Date;
    conversation: { rag: { name: string } };
  } | null;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProfileActivity({ activity }: { activity: ActivityData }) {
  return (
    <div className={styles.card}>
      <div className={styles.rowBetween}>
        <div className={styles.rowLabel}>Last login</div>
        <div className={styles.rowVal}>
          {activity.lastLoginAt ? (
            <>
              {timeAgo(activity.lastLoginAt)}
              {activity.lastLoginIp && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                  · {activity.lastLoginIp}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      </div>

      <div className={styles.rowBetween}>
        <div className={styles.rowLabel}>Last RAG created</div>
        <div className={styles.rowVal}>
          {activity.lastRag ? (
            <>
              {timeAgo(activity.lastRag.createdAt)}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                · &ldquo;{activity.lastRag.name}&rdquo;
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>No bots yet</span>
          )}
        </div>
      </div>

      <div className={styles.rowBetween}>
        <div className={styles.rowLabel}>Last document uploaded</div>
        <div className={styles.rowVal}>
          {activity.lastDoc ? (
            <>
              {timeAgo(activity.lastDoc.createdAt)}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                · {activity.lastDoc.name}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>No documents yet</span>
          )}
        </div>
      </div>

      <div className={styles.rowBetween} style={{ borderBottom: 'none' }}>
        <div className={styles.rowLabel}>Last query sent to</div>
        <div className={styles.rowVal}>
          {activity.lastMsg ? (
            <>
              {timeAgo(activity.lastMsg.createdAt)}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px', fontSize: '12px' }}>
                · &ldquo;{activity.lastMsg.conversation.rag.name}&rdquo;
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>No queries yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

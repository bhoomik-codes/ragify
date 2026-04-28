'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProfilePage.module.css';

interface Props {
  theme: string;
}

export function ProfilePreferences({ theme: initialTheme }: Props) {
  const router = useRouter();
  const [streaming, setStreaming] = useState(true);
  const [citations, setCitations] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    // Apply immediately to DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    setSaving(true);
    try {
      await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      {/* Theme */}
      <div className={styles.rowBetween}>
        <div className={styles.rowLabel}>Appearance</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['light', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={styles.miniBtn}
              style={{
                borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                color: theme === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: theme === t ? 600 : 400,
              }}
            >
              {t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      {/* Streaming */}
      <div className={styles.rowBetween}>
        <div className={styles.rowLabelGroup}>
          <div className={styles.rowLabel}>Streaming responses</div>
          <div className={styles.rowLabelSub}>Show tokens as they arrive</div>
        </div>
        <button
          className={`${styles.toggle} ${streaming ? styles.on : ''}`}
          onClick={() => setStreaming(v => !v)}
          aria-label="Toggle streaming"
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      {/* Citations */}
      <div className={styles.rowBetween} style={{ borderBottom: 'none' }}>
        <div className={styles.rowLabelGroup}>
          <div className={styles.rowLabel}>Citation display</div>
          <div className={styles.rowLabelSub}>Show source snippets in replies</div>
        </div>
        <button
          className={`${styles.toggle} ${citations ? styles.on : ''}`}
          onClick={() => setCitations(v => !v)}
          aria-label="Toggle citations"
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
    </div>
  );
}

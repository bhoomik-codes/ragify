'use client';

import React, { useState } from 'react';
import styles from './ProfilePage.module.css';
import Link from 'next/link';

const PROVIDERS = ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'MISTRAL', 'LOCAL'] as const;

const PROVIDER_LABELS: Record<string, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic',
  GOOGLE: 'Gemini',
  MISTRAL: 'Mistral',
  LOCAL: 'Local (Ollama)',
};

interface Props {
  connectedProviders: { provider: string }[];
}

export function ProfileSecurity({ connectedProviders }: Props) {
  const [loginNotifs, setLoginNotifs] = useState(false);
  const connectedSet = new Set(connectedProviders.map(k => k.provider));

  return (
    <>
      {/* Password & 2FA card */}
      <div className={styles.card} style={{ marginBottom: '0.75rem' }}>
        <div className={styles.rowBetween}>
          <div className={styles.rowLabelGroup}>
            <div className={styles.rowLabel}>Password</div>
          </div>
          <Link href="/settings" className={styles.miniBtn} style={{ textDecoration: 'none' }}>
            Change password
          </Link>
        </div>

        <div className={styles.rowBetween}>
          <div className={styles.rowLabelGroup}>
            <div className={styles.rowLabel}>Two-factor auth</div>
            <div className={styles.rowLabelSub}>Authenticator app</div>
          </div>
          <span className={`${styles.badge} ${styles.badgeAmber}`}>Not enabled</span>
        </div>

        <div className={styles.rowBetween} style={{ borderBottom: 'none' }}>
          <div className={styles.rowLabel}>Login notifications</div>
          <button
            className={`${styles.toggle} ${loginNotifs ? styles.on : ''}`}
            onClick={() => setLoginNotifs(v => !v)}
            aria-label="Toggle login notifications"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </div>

      {/* Connected API providers */}
      <div className={styles.secLabel} style={{ marginTop: '1.25rem' }}>Connected providers</div>
      <div className={styles.card}>
        {PROVIDERS.map(p => {
          const isConnected = connectedSet.has(p);
          return (
            <div key={p} className={styles.apiRow}>
              <div className={styles.apiProvider}>{PROVIDER_LABELS[p]}</div>
              <div className={styles.apiMono}>
                {isConnected ? '••••••••••••' : 'Not connected'}
              </div>
              <span className={`${styles.badge} ${isConnected ? styles.badgeGreen : styles.badgeGray}`}
                style={{ fontSize: '10px' }}>
                {isConnected ? 'Active' : 'None'}
              </span>
              <Link href="/settings" className={styles.miniBtn} style={{ textDecoration: 'none' }}>
                {isConnected ? 'Manage' : 'Add'}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

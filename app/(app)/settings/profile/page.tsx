import React from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import styles from './ProfilePage.module.css';
import { UserCircle, Clock, BarChart2, Lock, Star, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileActivity } from './ProfileActivity';
import { ProfileSecurity } from './ProfileSecurity';
import { ProfilePreferences } from './ProfilePreferences';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const dbUser = await db.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect('/login');

  const [
    ragsCount,
    docsCount,
    messagesCount,
    storageResult,
    lastRag,
    lastDoc,
    lastMsg,
    apiKeysCount,
    userApiKeys,
  ] = await Promise.all([
    db.rag.count({ where: { userId: session.user.id } }),
    db.document.count({ where: { rag: { userId: session.user.id } } }),
    db.message.count({ where: { role: 'USER', conversation: { userId: session.user.id } } }),
    db.document.aggregate({ where: { rag: { userId: session.user.id } }, _sum: { size: true } }),
    db.rag.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } }),
    db.document.findFirst({ where: { rag: { userId: session.user.id } }, orderBy: { createdAt: 'desc' } }),
    db.message.findFirst({
      where: { role: 'USER', conversation: { userId: session.user.id } },
      orderBy: { createdAt: 'desc' },
      include: { conversation: { include: { rag: true } } },
    }),
    db.userApiKey.count({ where: { userId: session.user.id } }),
    db.userApiKey.findMany({ where: { userId: session.user.id } }),
  ]);

  const storageUsedBytes = storageResult._sum.size || 0;
  const storageUsedMB = (storageUsedBytes / (1024 * 1024)).toFixed(1);
  const maxStorageMB = 500;

  const stats = { ragsCount, docsCount, messagesCount, storageUsedMB, maxStorageMB, apiKeysCount };
  const activity = { lastLoginAt: dbUser.lastLoginAt, lastLoginIp: dbUser.lastLoginIp, lastRag, lastDoc, lastMsg };

  // Sanitize api keys (mask the encrypted value — never expose it)
  const sanitizedKeys = userApiKeys.map(k => ({ provider: k.provider }));

  return (
    <div className={styles.content} style={{ padding: '1.5rem 2rem', background: 'var(--bg)', minHeight: '100vh' }}>
      <h1 className={styles.pageTitle}>Profile</h1>

      <div className={styles.shell}>
        {/* ── Left nav ── */}
        <nav className={styles.nav}>
          <a href="#identity" className={`${styles.navItem} ${styles.active}`}>
            <UserCircle className={styles.navIcon} />
            <span>Profile</span>
          </a>
          <a href="#activity" className={styles.navItem}>
            <Clock className={styles.navIcon} />
            <span>Activity</span>
          </a>

          <div className={styles.navSep} />

          <a href="#usage" className={styles.navItem}>
            <BarChart2 className={styles.navIcon} />
            <span>Usage &amp; Limits</span>
          </a>
          <a href="#security" className={styles.navItem}>
            <Lock className={styles.navIcon} />
            <span>Security</span>
          </a>
          <a href="#preferences" className={styles.navItem}>
            <Star className={styles.navIcon} />
            <span>Preferences</span>
          </a>

          <div className={styles.navSep} />
          <div className={styles.navSpacer} />

          <Link href="/api/auth/signout" className={`${styles.navItem} ${styles.navDanger}`}>
            <LogOut className={styles.navIcon} />
            <span>Sign out</span>
          </Link>
        </nav>

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: '2rem', overflow: 'auto', background: 'var(--bg)' }}>

          {/* ── Identity ── */}
          <section id="identity" className={styles.section}>
            <div className={styles.secLabel}>Identity</div>
            <ProfileIdentity user={dbUser} />
          </section>

          {/* ── Ragify Stats ── */}
          <section id="usage" className={styles.section}>
            <div className={styles.secLabel}>Ragify stats</div>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.ragsCount}</div>
                <div className={styles.statLbl}>RAG bots</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.docsCount}</div>
                <div className={styles.statLbl}>Documents</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.messagesCount}</div>
                <div className={styles.statLbl}>Queries</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>{stats.apiKeysCount}</div>
                <div className={styles.statLbl}>API keys</div>
              </div>
            </div>

            {/* Storage bar */}
            <div className={styles.card}>
              <div className={styles.rowBetween} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div className={styles.rowLabel}>Storage used</div>
                <div className={styles.rowVal}>
                  {stats.storageUsedMB} MB
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {stats.maxStorageMB} MB</span>
                </div>
              </div>
              <div style={{
                marginTop: '10px',
                height: '6px',
                borderRadius: '99px',
                background: 'var(--border)',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (Number(stats.storageUsedMB) / stats.maxStorageMB) * 100)}%`,
                  borderRadius: '99px',
                  background: 'var(--accent)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </section>

          {/* ── Activity ── */}
          <section id="activity" className={styles.section}>
            <div className={styles.secLabel}>Activity</div>
            <ProfileActivity activity={activity} />
          </section>

          {/* ── Security ── */}
          <section id="security" className={styles.section}>
            <div className={styles.secLabel}>Security</div>
            <ProfileSecurity connectedProviders={sanitizedKeys} />
          </section>

          {/* ── Preferences ── */}
          <section id="preferences" className={styles.section}>
            <div className={styles.secLabel}>Preferences</div>
            <ProfilePreferences theme={dbUser.theme} />
          </section>

          {/* ── Danger Zone ── */}
          <section id="danger" className={styles.section}>
            <div className={styles.secLabel}>Danger zone</div>
            <div className={styles.dangerCard}>
              <div className={styles.dangerRow}>
                <div>
                  <div className={styles.dangerTitle}>Delete all RAG bots</div>
                  <div className={styles.dangerSub}>Permanently removes all bots, documents, and embeddings.</div>
                </div>
                <button className={styles.dangerBtn} onClick={undefined}>Delete all</button>
              </div>
              <div className={styles.dangerRow} style={{ borderBottom: 'none' }}>
                <div>
                  <div className={styles.dangerTitle}>Delete account</div>
                  <div className={styles.dangerSub}>Irreversible. All data is permanently erased.</div>
                </div>
                <button className={styles.dangerBtn}>Delete account</button>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

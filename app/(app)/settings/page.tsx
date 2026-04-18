import React from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { mapUserApiKeyToDto, mapApiKeyToDto } from '@/lib/mappers';
import { ProviderKeyManager } from '@/components/settings/ProviderKeyManager';
import { PlatformKeyManager } from '@/components/settings/PlatformKeyManager';
import styles from '@/components/settings/Settings.module.css';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Fetch sanitized keys for initial render
  const [userApiKeys, platformKeys] = await Promise.all([
    db.userApiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { provider: 'asc' },
    }),
    db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const providerKeyDtos = userApiKeys.map(mapUserApiKeyToDto);
  const platformKeyDtos = platformKeys.map(mapApiKeyToDto);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your account credentials and platform access.</p>
      </header>

      <ProviderKeyManager initialKeys={providerKeyDtos} />
      
      <div style={{ height: '1px', background: 'var(--border)', width: '100%' }} />
      
      <PlatformKeyManager initialKeys={platformKeyDtos} />
    </div>
  );
}

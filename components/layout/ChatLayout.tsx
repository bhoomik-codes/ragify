'use client';

import React from 'react';
import { useArtifactStore } from '@/lib/store/artifactStore';
import styles from './ChatLayout.module.css';

interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function ChatLayout({ children, sidebar }: ChatLayoutProps) {
  const { sidebarOpen } = useArtifactStore();

  return (
    <div
      className={styles.layout}
      data-artifact-open={sidebarOpen ? 'true' : 'false'}
    >
      <div className={styles.chatArea}>{children}</div>
      <div className={styles.sidebarArea}>{sidebar}</div>
    </div>
  );
}

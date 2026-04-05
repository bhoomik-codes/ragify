import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { AppShellProps } from '../../lib/types';
import styles from './AppShell.module.css';

export const AppShell: React.FC<AppShellProps> = ({ children, initialTheme = 'light', user }) => {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainWrapper}>
        <TopBar />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

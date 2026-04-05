'use client';

import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import styles from './TopBar.module.css';

export const TopBar: React.FC = () => {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>Ragify</h1>
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        <div className={styles.avatar} aria-label="User profile dropdown placeholder">
          <span className={styles.avatarInitials}>U</span>
        </div>
      </div>
    </header>
  );
};

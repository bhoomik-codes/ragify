'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';
import type { UserDto } from '../../lib/types';
import styles from './TopBar.module.css';

interface TopBarProps {
  user?: UserDto;
}

export const TopBar: React.FC<TopBarProps> = ({ user }) => {
  const initials = (user?.displayName || user?.name || user?.email || 'U').substring(0, 2).toUpperCase();

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>Ragify</h1>
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        <Link href="/settings/profile" className={styles.avatar} aria-label="Go to profile">
          {user?.image ? (
            <Image src={user.image} alt="Avatar" fill className="object-cover rounded-full" />
          ) : (
            <span className={styles.avatarInitials}>{initials}</span>
          )}
        </Link>
      </div>
    </header>
  );
};

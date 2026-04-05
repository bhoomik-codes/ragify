import React from 'react';
import Link from 'next/link';
import styles from './layout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Ragify
        </Link>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

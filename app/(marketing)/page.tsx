import React from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import styles from './page.module.css';

export default function MarketingPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>Ragify</div>
        <nav className={styles.nav}>
          <Link href="/login" passHref legacyBehavior>
            <a className={styles.linkWrapper}>
              <Button variant="ghost">Login</Button>
            </a>
          </Link>
          <Link href="/signup" passHref legacyBehavior>
            <a className={styles.linkWrapper}>
              <Button>Sign Up</Button>
            </a>
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Your AI. Your Data. Instantly.</h1>
          <p className={styles.subtitle}>
            Build, deploy, and chat with production-ready RAG pipelines in minutes. No complex infrastructure required.
          </p>
          <div className={styles.ctaGroup}>
             <Link href="/signup" passHref legacyBehavior>
                <a className={styles.linkWrapper}>
                  <Button size="lg">Get Started Free</Button>
                </a>
             </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <svg className={styles.svgAnim} viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect className={styles.docBox} x="20" y="60" width="80" height="100" rx="8" stroke="currentColor" strokeWidth="4" />
            <path className={styles.docLines} d="M35 80h50M35 100h50M35 120h30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            
            <circle className={styles.embedCircle} cx="200" cy="110" r="40" stroke="currentColor" strokeWidth="4" strokeDasharray="10 10"/>
            
            <rect className={styles.chatBox} x="300" y="60" width="80" height="100" rx="8" stroke="currentColor" strokeWidth="4" />
            <path className={styles.chatLines} d="M315 80h20M315 100h50M345 120h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            
            <circle className={styles.dot1} cx="130" cy="110" r="4" fill="currentColor"/>
            <circle className={styles.dot2} cx="150" cy="110" r="4" fill="currentColor"/>
            <circle className={styles.dot3} cx="170" cy="110" r="4" fill="currentColor"/>

            <circle className={styles.dot4} cx="250" cy="110" r="4" fill="currentColor"/>
            <circle className={styles.dot5} cx="270" cy="110" r="4" fill="currentColor"/>
            <circle className={styles.dot6} cx="290" cy="110" r="4" fill="currentColor"/>
          </svg>
        </div>
      </main>
    </div>
  );
}

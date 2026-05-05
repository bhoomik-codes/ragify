"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Rocket, BrainCircuit, ShieldCheck } from 'lucide-react';
import styles from './page.module.css';

// Dynamically import 3D scene to prevent SSR crashes
const Scene = dynamic(() => import('./Scene'), { ssr: false });

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.3,
      duration: 0.8,
      ease: [0.215, 0.61, 0.355, 1],
    },
  }),
};

export default function MarketingPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <BrainCircuit size={28} color="#4f9cf9" />
          Ragify
        </div>
        <nav className={styles.nav}>
          <Link href="/how-rag-works" className={styles.navLink}>How RAG Works</Link>
          <Link href="/contact" className={styles.navLink}>Contact</Link>
          <Link href="/login" className={styles.navLink}>Login</Link>
          <Link href="/signup" passHref legacyBehavior>
            <a className={styles.linkWrapper}>
              <button className={styles.ctaPrimary} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                Get Started
              </button>
            </a>
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        {/* HERO SECTION */}
        <section className={styles.heroSection}>
          <div className={styles.heroVisual}>
            {mounted && <Scene />}
          </div>
          
          <div className={styles.heroText}>
            <h1 className={styles.titleLine}>
              <motion.span custom={0} initial="hidden" animate="visible" variants={textVariants} style={{ display: 'block' }}>Your AI.</motion.span>
              <motion.span custom={1} initial="hidden" animate="visible" variants={textVariants} style={{ display: 'block', color: '#64748b' }}>Your Data.</motion.span>
              <motion.span custom={2} initial="hidden" animate="visible" variants={textVariants} style={{ display: 'block', color: '#4f9cf9' }}>Instantly.</motion.span>
            </h1>
            
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
            >
              Build, deploy, and chat with production-ready RAG pipelines in minutes. No complex infrastructure required.
            </motion.p>
            
            <motion.div 
              className={styles.ctaGroup}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring', stiffness: 200, damping: 20 }}
            >
               <Link href="/signup" passHref legacyBehavior>
                  <a className={styles.linkWrapper}>
                    <button className={styles.ctaPrimary}>Start Building Free</button>
                  </a>
               </Link>
            </motion.div>
          </div>
        </section>

        {/* STATS BANNER */}
        <section className={styles.statsBanner}>
          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>10k+</span>
              <span className={styles.statLabel}>Documents Processed</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>99.9%</span>
              <span className={styles.statLabel}>Uptime</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>&lt;200ms</span>
              <span className={styles.statLabel}>Latency</span>
            </div>
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section className={styles.section} id="features">
          <h2 className={styles.sectionTitle}>The Ragify Advantage</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}><Rocket /></div>
              <h3 className={styles.featureTitle}>Instant Deployment</h3>
              <p className={styles.featureDesc}>
                Upload your documents and let our pipeline handle parsing, chunking, and vector embedding in seconds.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}><BrainCircuit /></div>
              <h3 className={styles.featureTitle}>Hybrid Search</h3>
              <p className={styles.featureDesc}>
                Leverage Reciprocal Rank Fusion (RRF) combining dense vector and keyword search for unmatched accuracy.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}><ShieldCheck /></div>
              <h3 className={styles.featureTitle}>Enterprise Security</h3>
              <p className={styles.featureDesc}>
                Your data stays yours. We use AES-256-GCM encryption for BYOK and maintain strict compliance standards.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

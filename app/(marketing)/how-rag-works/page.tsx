"use client";

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { BrainCircuit, XCircle, CheckCircle2, FileText, Scissors, Database, Search, MessageSquare } from 'lucide-react';
import styles from './how.module.css';

const BrainScene = dynamic(() => import('./BrainScene'), { ssr: false });

import { Variants } from 'framer-motion';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export default function HowRagWorksPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src="/ragify_logo.svg" alt="Ragify Logo" width={28} height={28} />
          Ragify
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/contact" className={styles.navLink}>Contact</Link>
          <Link href="/login" className={styles.navLink}>Login</Link>
        </nav>
      </header>

      <main className={styles.main}>
        
        {/* HERO SECTION */}
        <section className={styles.hero}>
          <motion.h1 
            className={styles.heroTitle}
            initial="hidden" animate="visible" variants={fadeUp}
          >
            How RAG Actually Works
          </motion.h1>
          <motion.p 
            className={styles.heroSubtitle}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          >
            Retrieval-Augmented Generation bridges the gap between static AI models and your private, dynamic data.
          </motion.p>
        </section>

        {/* 1. What is RAG */}
        <section className={styles.section}>
          <div className={styles.splitLayout}>
            <motion.div className={styles.splitText} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className={styles.sectionTitle}>What is RAG?</h2>
              <p className={styles.paragraph}>
                Instead of relying on the knowledge frozen inside a large language model when it was trained, RAG acts like an open-book test.
              </p>
              <p className={styles.paragraph}>
                When you ask a question, the system first <strong>retrieves</strong> relevant information from your private documents, and then <strong>augments</strong> the AI's prompt with those facts, allowing it to <strong>generate</strong> an accurate, grounded answer.
              </p>
            </motion.div>
            <motion.div className={styles.splitVisual} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <BrainScene />
            </motion.div>
          </div>
        </section>

        {/* 2. The Problem RAG Solves */}
        <section className={styles.section}>
          <motion.h2 className={styles.sectionTitle} style={{ textAlign: 'center' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            The Problem RAG Solves
          </motion.h2>
          <div className={styles.comparisonGrid}>
            <motion.div className={`${styles.card} ${styles.cardBad}`} initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h3 className={styles.cardTitle}><XCircle color="#ef4444" /> LLM Without RAG</h3>
              <p className={styles.paragraph}>• Hallucinates facts confidently.</p>
              <p className={styles.paragraph}>• Knowledge is completely outdated past its training cutoff.</p>
              <p className={styles.paragraph}>• Has zero visibility into your private, proprietary enterprise data.</p>
            </motion.div>
            
            <motion.div className={`${styles.card} ${styles.cardGood}`} initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h3 className={styles.cardTitle}><CheckCircle2 color="#4f9cf9" /> LLM With RAG</h3>
              <p className={styles.paragraph}>• Grounded in truth and source materials.</p>
              <p className={styles.paragraph}>• Up-to-date with the latest documents uploaded seconds ago.</p>
              <p className={styles.paragraph}>• Seamlessly securely accesses your private knowledge base.</p>
            </motion.div>
          </div>
        </section>

        {/* 3. Step-by-Step Pipeline */}
        <section className={styles.section}>
          <motion.h2 className={styles.sectionTitle} style={{ textAlign: 'center' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            The Pipeline
          </motion.h2>
          
          <div className={styles.timeline}>
            
            <motion.div className={styles.timelineItem} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <div className={styles.timelineContent}>
                <h3 className={styles.cardTitle}>1. Document Ingestion</h3>
                <p className={styles.paragraph}>We parse PDFs, Word docs, and text files instantly to extract raw text content.</p>
              </div>
              <div className={styles.timelineCenter}><FileText /></div>
              <div className={styles.timelineVisual}>
                <img src="/marketing/step_1.png" alt="Document Ingestion" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
              </div>
            </motion.div>

            <motion.div className={styles.timelineItem} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <div className={styles.timelineContent}>
                <h3 className={styles.cardTitle}>2. Semantic Chunking</h3>
                <p className={styles.paragraph}>Documents are sliced into smaller, mathematically overlapping chunks to preserve context and meaning.</p>
              </div>
              <div className={styles.timelineCenter}><Scissors /></div>
              <div className={styles.timelineVisual}>
                <img src="/marketing/step_2.png" alt="Semantic Chunking" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
              </div>
            </motion.div>

            <motion.div className={styles.timelineItem} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <div className={styles.timelineContent}>
                <h3 className={styles.cardTitle}>3. Embedding & Storage</h3>
                <p className={styles.paragraph}>Chunks are converted into high-dimensional vector arrays and stored in a specialized Vector Database.</p>
              </div>
              <div className={styles.timelineCenter}><Database /></div>
              <div className={styles.timelineVisual}>
                <img src="/marketing/step_3.png" alt="Embedding" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
              </div>
            </motion.div>

            <motion.div className={styles.timelineItem} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <div className={styles.timelineContent}>
                <h3 className={styles.cardTitle}>4. Hybrid Retrieval</h3>
                <p className={styles.paragraph}>When a user asks a question, we execute a Reciprocal Rank Fusion search (Dense + Keyword) to find the perfect matching chunks.</p>
              </div>
              <div className={styles.timelineCenter}><Search /></div>
              <div className={styles.timelineVisual}>
                <img src="/marketing/step_4.png" alt="Hybrid Retrieval" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
              </div>
            </motion.div>

            <motion.div className={styles.timelineItem} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <div className={styles.timelineContent}>
                <h3 className={styles.cardTitle}>5. LLM Generation</h3>
                <p className={styles.paragraph}>The matched context is securely injected into the LLM prompt, forcing it to generate a highly accurate, cited response.</p>
              </div>
              <div className={styles.timelineCenter}><MessageSquare /></div>
              <div className={styles.timelineVisual}>
                <img src="/marketing/step_5.png" alt="LLM Generation" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
              </div>
            </motion.div>
            
          </div>
        </section>

        {/* 5. Video Embed */}
        <section className={styles.section}>
          <motion.h2 className={styles.sectionTitle} style={{ textAlign: 'center' }} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            See It In Action
          </motion.h2>
          <motion.div className={styles.videoWrapper} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <iframe 
              className={styles.iframe}
              src="https://www.youtube.com/embed/T-D1OfcDW1M" 
              title="YouTube video player" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen>
            </iframe>
          </motion.div>
          
          <div style={{ textAlign: 'center' }}>
            <Link href="/signup" passHref legacyBehavior>
              <a><button className={styles.ctaPrimary}>Ready to build your RAG pipeline?</button></a>
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}

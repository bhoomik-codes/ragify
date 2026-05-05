"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { BrainCircuit, Github, Twitter, Linkedin, MapPin, Mail, Loader2, Send } from 'lucide-react';
import styles from './contact.module.css';

const EnvelopeScene = dynamic(() => import('./EnvelopeScene'), { ssr: false });

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    
    // Confetti burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f9cf9', '#a78bfa', '#ffffff']
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <BrainCircuit size={28} color="#4f9cf9" />
          Ragify
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/how-rag-works" className={styles.navLink}>How RAG Works</Link>
          <Link href="/login" className={styles.navLink}>Login</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <motion.div 
          className={styles.splitLayout}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Left Panel */}
          <div className={styles.leftPanel}>
            <div className={styles.sceneContainer}>
              <EnvelopeScene />
            </div>
            
            <h1 className={styles.title}>Let's Connect</h1>
            <p className={styles.subtitle}>
              Ready to deploy your enterprise RAG pipeline? Have a custom use case? Our engineers are ready to assist.
            </p>
            
            <div className={styles.contactInfo}>
              <div className={styles.infoItem}>
                <Mail size={20} color="#4f9cf9" />
                hello@ragify.ai
              </div>
              <div className={styles.infoItem}>
                <MapPin size={20} color="#4f9cf9" />
                San Francisco, CA
              </div>
            </div>
            
            <div className={styles.socialLinks}>
              <div className={styles.socialIcon}><Github size={24} /></div>
              <div className={styles.socialIcon}><Twitter size={24} /></div>
              <div className={styles.socialIcon}><Linkedin size={24} /></div>
            </div>
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
                <h2 className={styles.title} style={{ fontSize: '2rem' }}>Message Sent!</h2>
                <p className={styles.subtitle}>We'll be in touch with you shortly.</p>
                <button 
                  className={styles.submitBtn} 
                  onClick={() => setIsSuccess(false)}
                  style={{ margin: '0 auto' }}
                >
                  Send Another
                </button>
              </motion.div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                  <input type="text" id="name" className={styles.input} placeholder=" " required />
                  <label htmlFor="name" className={styles.label}>Full Name</label>
                </div>
                
                <div className={styles.inputGroup}>
                  <input type="email" id="email" className={styles.input} placeholder=" " required />
                  <label htmlFor="email" className={styles.label}>Email Address</label>
                </div>
                
                <div className={styles.inputGroup}>
                  <textarea id="message" className={styles.textarea} placeholder=" " required></textarea>
                  <label htmlFor="message" className={styles.label}>How can we help?</label>
                </div>
                
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className={styles.spin} size={20} /> Sending...</>
                  ) : (
                    <><Send size={20} /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

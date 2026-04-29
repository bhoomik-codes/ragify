'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './TypingIndicator.module.css';

export function TypingIndicator() {
  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </motion.div>
  );
}

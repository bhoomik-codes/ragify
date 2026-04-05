import React from 'react';
import styles from './Spinner.module.css';

export const Spinner: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={`${styles.spinner} ${className || ''}`} />;
};

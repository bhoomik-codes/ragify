import React from 'react';
import type { InputProps } from '../../lib/types';
import styles from './Input.module.css';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className={`${styles.wrapper} ${className || ''}`}>
        {label && (
          <label className={styles.label}>
            {label}
            {props.required && <span className={styles.required}>*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`${styles.input} ${error ? styles.hasError : ''}`}
          {...props}
        />
        {error && <p className={styles.errorMessage}>{error}</p>}
        {hint && !error && <p className={styles.hint}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

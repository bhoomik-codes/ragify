import React from 'react';
import type { ButtonProps } from '../../lib/types';
import styles from './Button.module.css';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} disabled={disabled || loading} className={classNames} {...props}>
        {loading && <span className={styles.spinner} />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

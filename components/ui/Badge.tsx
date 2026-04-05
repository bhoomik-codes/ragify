import React from 'react';
import type { BadgeProps } from '../../lib/types';
import styles from './Badge.module.css';

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', size = 'sm', className, children, ...props }) => {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
};

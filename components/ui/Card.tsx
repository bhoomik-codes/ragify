import React from 'react';
import type { CardProps } from '../../lib/types';
import styles from './Card.module.css';

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, className, children, ...props }, ref) => {
    const classNames = [
      styles.card,
      styles[`padding-${padding}`],
      hover && styles.hoverable,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './MathBlock.module.css';

interface MathBlockProps {
  content: string;
  display?: boolean;
}

export function MathBlock({ content, display = false }: MathBlockProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(content, ref.current, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      });
    } catch (e) {
      if (ref.current) {
        ref.current.textContent = content;
      }
    }
  }, [content, display]);

  return (
    <span
      ref={ref}
      className={display ? styles.mathBlock : styles.mathInline}
      aria-label={`Math: ${content}`}
    />
  );
}

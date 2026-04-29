'use client';

import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import { sanitizeSchema } from '@/lib/parser/sanitize';
import { CodeBlock } from './CodeBlock';
import styles from './RichRenderer.module.css';
import 'katex/dist/katex.min.css';

interface RichRendererProps {
  content: string;
}

// rehype plugin ordering matters: katex → raw html → sanitize
const rehypePlugins: PluggableList = [
  rehypeKatex,
  rehypeRaw,
  [rehypeSanitize, sanitizeSchema],
];

const remarkPlugins: PluggableList = [remarkGfm, remarkMath];

export function RichRenderer({ content }: RichRendererProps) {
  const components: Components = {
    // Route all code blocks through our CodeBlock dispatcher
    code: CodeBlock as Components['code'],
    // Wrap standard GFM tables in a scrollable container
    table: ({ children, ...rest }) => (
      <div className={styles.tableContainer}>
        <table {...rest}>{children}</table>
      </div>
    ),
  };

  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

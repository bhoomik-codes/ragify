'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { InteractiveChart } from './InteractiveChart';
import { RichTable } from './RichTable';
import { MermaidDiagram } from './MermaidDiagram';
import { HtmlArtifact } from './HtmlArtifact';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const content = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Block-level special renderers
  if (!inline && language) {
    if (language === 'chart') {
      return <InteractiveChart raw={content} />;
    }

    if (language === 'table') {
      const lines = content
        .split('\n')
        .filter(Boolean)
        .map(l => l.split(',').map(c => c.trim()));
      const headers = lines[0] ?? [];
      const rows = lines.slice(1);
      return <RichTable headers={headers} rows={rows} />;
    }

    if (language === 'mermaid') {
      return <MermaidDiagram source={content} />;
    }

    if (language === 'html' || language === 'react') {
      return <HtmlArtifact html={content} isReact={language === 'react'} />;
    }

    // Standard syntax-highlighted code block
    return (
      <div className={styles.codeBlockWrapper}>
        <div className={styles.codeBlockHeader}>
          <span className={styles.languageBadge}>{language}</span>
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className={styles.highlighterWrapper}>
          <SyntaxHighlighter
            style={vscDarkPlus as { [key: string]: React.CSSProperties }}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
            }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }

  // Inline code
  return <code className={className}>{children}</code>;
}

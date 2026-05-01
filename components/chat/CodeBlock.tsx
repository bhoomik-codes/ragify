'use client';

import React, { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './CodeBlock.module.css';

const InteractiveChart = dynamic(() => import('./InteractiveChart').then(mod => mod.InteractiveChart), { 
  ssr: false, 
  loading: () => <div className={styles.loadingBlock}><Loader2 className="animate-spin" /> Loading Chart...</div> 
});
const RichTable = dynamic(() => import('./RichTable').then(mod => mod.RichTable), { ssr: false });
const MermaidDiagram = dynamic(() => import('./MermaidDiagram').then(mod => mod.MermaidDiagram), { 
  ssr: false,
  loading: () => <div className={styles.loadingBlock}><Loader2 className="animate-spin" /> Loading Diagram...</div> 
});
const HtmlArtifact = dynamic(() => import('./HtmlArtifact').then(mod => mod.HtmlArtifact), { ssr: false });
const CodeBlockHighlighter = dynamic(() => import('./CodeBlockHighlighter').then(mod => mod.CodeBlockHighlighter), { ssr: false });

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
          <CodeBlockHighlighter language={language} content={content} />
        </div>
      </div>
    );
  }

  // Inline code
  return <code className={className}>{children}</code>;
}

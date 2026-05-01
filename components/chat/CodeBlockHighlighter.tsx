import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockHighlighterProps {
  language: string;
  content: string;
}

export function CodeBlockHighlighter({ language, content }: CodeBlockHighlighterProps) {
  return (
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
  );
}

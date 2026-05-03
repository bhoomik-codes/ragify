'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react';
import styles from './HtmlArtifact.module.css';

import { useArtifactStore } from '@/lib/store/artifactStore';

interface HtmlArtifactProps {
  html: string;
  title?: string;
  isReact?: boolean;
}

export function HtmlArtifact({ html, title, isReact }: HtmlArtifactProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);
  const [key, setKey] = useState(0);
  const { addArtifact, updateArtifact, artifacts } = useArtifactStore();

  const openInSidebar = () => {
    // Check if an artifact with this title already exists
    const existing = artifacts.find(a => a.title === title && (isReact ? a.type === 'react' : a.type === 'html'));
    if (existing) {
      updateArtifact(existing.id, html);
    } else {
      addArtifact({
        type: isReact ? 'react' : 'html',
        title: title || (isReact ? 'React Component' : 'HTML Page'),
        content: html
      });
    }
  };

  const buildSrcDoc = () => {
    const baseStyles = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #ffffff; --surface: #f5f5f4; --border: rgba(0,0,0,0.12);
          --text: #1c1c1a; --muted: #6b6b67; --accent: #5b4fcf;
          --radius: 8px; --font: system-ui, -apple-system, sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          :root { --bg: #1a1a18; --surface: #242422; --border: rgba(255,255,255,0.1); --text: #e8e6de; --muted: #9c9a92; }
        }
        body { 
          font-family: var(--font); 
          background: var(--bg); 
          color: var(--text); 
          padding: 16px;
          min-height: 100px;
        }
      </style>
    `;

    // One-shot resize: measure once on load + after a short settle delay.
    // Using ResizeObserver on document.body causes an infinite loop:
    // iframe grows → parent sets taller height → body reflows → observer fires → repeat.
    const resizeScript = `
      <script>
        const MAX_H = 700;
        let lastH = 0;
        const send = () => {
          const h = Math.min(document.body.scrollHeight, MAX_H);
          if (h !== lastH) {
            lastH = h;
            window.parent.postMessage({ type: 'resize', height: h }, '*');
          }
        };
        window.addEventListener('load', () => { send(); setTimeout(send, 300); setTimeout(send, 800); });
      <\/script>
    `;

    // Surface JS runtime errors visually instead of blank white box
    const errorBoundary = `
      <script>
        window.onerror = function(msg, src, line, col) {
          document.body.innerHTML =
            '<div style="color:#ef5350;font-family:monospace;padding:20px;' +
            'background:#1e1e1e;border-radius:8px;border:1px solid #ef5350;">' +
            '<strong>⚠ JavaScript Error</strong><br/>' + msg +
            '<br/><small style=\\'opacity:.7\\'>' + (src||'') + ' line ' + line + ':' + col + '</small>' +
            '</div>';
        };
      <\/script>
    `;

    // Strip broken external file references the LLM sometimes generates
    // Strip LOCAL file references only (not CDN URLs starting with http/https)
    const sanitizeHtml = (raw: string) => raw
      // Remove <link href="local-file.css"> but keep CDN links
      .replace(/<link[^>]+href=["'](?!https?:\/\/)[^"']*\.css["'][^>]*>/gi, '')
      // Remove <script src="local-file.js"> but keep CDN scripts
      .replace(/<script[^>]+src=["'](?!https?:\/\/)[^"']*\.js["'][^>]*><\/script>/gi, '');

    if (isReact) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          ${baseStyles}
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18",
              "react-dom/client": "https://esm.sh/react-dom@18/client",
              "lucide-react": "https://esm.sh/lucide-react"
            }
          }
          </script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel" data-type="module">
            import React from 'react';
            import { createRoot } from 'react-dom/client';
            
            try {
              ${html.includes('createRoot') ? html : `
                const App = () => {
                  ${html}
                };
                const root = createRoot(document.getElementById('root'));
                root.render(<App />);
              `}
            } catch (err) {
              document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;"><strong>React Render Error:</strong><br/>' + err.message + '</div>';
            }
          </script>
          ${resizeScript}
        </body>
        </html>
      `;
    }

    // Detect if the LLM gave us a full HTML document
    const isFullDocument = /<html/i.test(html);

    if (isFullDocument) {
      const cleaned = sanitizeHtml(html);
      // Inject error boundary right after <body> and resize before </body>
      return cleaned
        .replace(/<body([^>]*)>/i, `<body$1>${errorBoundary}`)
        .replace(/<\/body>/i, `${resizeScript}</body>`);
    }

    // Body-only snippet — wrap it
    return `
      <!DOCTYPE html>
      <html>
      <head>
        ${baseStyles}
      </head>
      <body>
        ${errorBoundary}
        ${sanitizeHtml(html)}
        ${resizeScript}
      </body>
      </html>
    `;
  };


  useEffect(() => {
    let rafId: number;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize' && event.data.height) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          // Hard cap at 700px — prevents runaway growth
          setHeight(Math.min(Math.max(150, event.data.height), 700));
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleRefresh = () => setKey(k => k + 1);

  return (
    <motion.div 
      className={styles.artifactContainer}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.artifactHeader}>
        <span className={styles.artifactTitle}>{title || (isReact ? 'React Artifact' : 'HTML Artifact')}</span>
        <div className={styles.artifactActions}>
          <button onClick={handleRefresh} title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={openInSidebar} title="Open in Sidebar"><ExternalLink size={14} /></button>
          <button title="Fullscreen"><Maximize2 size={14} /></button>
        </div>
      </div>
      <div className={styles.iframeWrapper} style={{ height }}>
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={buildSrcDoc()}
          sandbox="allow-scripts"
          className={styles.iframe}
          title={title || 'Artifact'}
        />
      </div>
    </motion.div>
  );
}

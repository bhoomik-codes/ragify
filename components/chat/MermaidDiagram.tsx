'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Copy, Maximize2, Download, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import styles from './MermaidDiagram.module.css';

interface MermaidProps {
  source: string;
}

export function MermaidDiagram({ source }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Dynamically import mermaid — never runs on the server
  useEffect(() => {
    let cancelled = false;
    import('mermaid').then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        fontFamily: 'inherit',
      });
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !source) return;
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const { default: mermaid } = await import('mermaid');

        // ── Console debug: always log the source we're about to render ────
        console.group('%c[MermaidDiagram] Source', 'color: #6c63ff; font-weight: bold;');
        console.log(source);
        console.groupEnd();

        try {
          await mermaid.parse(source);
        } catch (parseError: any) {
          const errMsg = parseError?.message || 'Invalid Mermaid syntax.';
          console.error('[MermaidDiagram] Parse failed:', errMsg);
          if (!cancelled) setError(errMsg);
          return;
        }

        const id = `mmd-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(id, source);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || 'Failed to render diagram';
          console.error('[MermaidDiagram] Render failed:', msg);
          setError(msg);
        }
      } finally {
        // Mermaid sometimes leaves orphaned error containers in the DOM
        document.querySelectorAll('[id^="dmmd-"]').forEach(n => n.remove());
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [source, ready]);

  if (error) {
    return (
      <div className={styles.errorCard}>
        <AlertCircle size={20} />
        <div>
          <strong>Mermaid Render Error</strong>
          <pre className={styles.errorPre}>{error}</pre>
        </div>
      </div>
    );
  }

  const handleDownloadImage = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, { backgroundColor: 'var(--bg-card)' });
      const link = document.createElement('a');
      link.download = `diagram-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to download diagram', e);
    }
  };

  const handleCopyImage = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, { backgroundColor: 'var(--bg-card)' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (e) {
      console.error('Failed to copy diagram', e);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={styles.diagramContainer}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.diagramHeader}>
        <span className={styles.diagramLabel}>Diagram</span>
        <div className={styles.diagramActions}>
          <button onClick={() => navigator.clipboard.writeText(source)} title="Copy Source">
            <Copy size={14} />
          </button>
          <button title="Copy as Image" onClick={handleCopyImage}><ImageIcon size={14} /></button>
          <button title="Download as Image" onClick={handleDownloadImage}><Download size={14} /></button>
          <button title="Fullscreen" onClick={handleFullscreen}><Maximize2 size={14} /></button>
        </div>
      </div>
      {svg ? (
        <div
          className={styles.diagramBody}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className={styles.loading}>Rendering diagram…</div>
      )}
    </motion.div>
  );
}

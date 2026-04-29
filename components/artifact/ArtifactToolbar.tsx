'use client';

import React from 'react';
import { useArtifactStore } from '@/lib/store/artifactStore';
import { Download, Maximize2, ExternalLink, Copy, GitFork } from 'lucide-react';
import styles from './ArtifactToolbar.module.css';

export function ArtifactToolbar() {
  const { artifacts, activeId } = useArtifactStore();
  const artifact = artifacts.find(a => a.id === activeId);

  if (!artifact) return null;

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(artifact.content);
  };

  const handlePopout = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${artifact.title}</title></head><body>${artifact.content}</body></html>`);
    win.document.close();
  };

  const handleFullscreen = () => {
    const el = document.querySelector('[data-artifact-content]') as HTMLElement | null;
    if (el?.requestFullscreen) el.requestFullscreen();
  };

  return (
    <div className={styles.toolbar}>
      <button onClick={handleCopySource} title="Copy Source" className={styles.btn}>
        <Copy size={14} />
        <span>Copy</span>
      </button>
      <button onClick={handleDownload} title="Download" className={styles.btn}>
        <Download size={14} />
        <span>Download</span>
      </button>
      <button onClick={handlePopout} title="Pop out in new window" className={styles.btn}>
        <ExternalLink size={14} />
        <span>Pop out</span>
      </button>
      <button onClick={handleFullscreen} title="Fullscreen" className={styles.btn}>
        <Maximize2 size={14} />
        <span>Fullscreen</span>
      </button>
    </div>
  );
}

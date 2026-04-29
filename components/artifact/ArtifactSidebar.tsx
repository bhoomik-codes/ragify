'use client';

import React from 'react';
import { useArtifactStore } from '@/lib/store/artifactStore';
import { X, FileText, Code, PieChart, Activity } from 'lucide-react';
import { HtmlArtifact } from '../chat/HtmlArtifact';
import { MermaidDiagram } from '../chat/MermaidDiagram';
import { InteractiveChart } from '../chat/InteractiveChart';
import { ArtifactToolbar } from './ArtifactToolbar';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ArtifactSidebar.module.css';

export function ArtifactSidebar() {
  const { artifacts, activeId, sidebarOpen, setActive, toggleSidebar } = useArtifactStore();
  const activeArtifact = artifacts.find(a => a.id === activeId);

  const getIcon = (type: string) => {
    switch (type) {
      case 'chart': return <PieChart size={14} />;
      case 'mermaid': return <Activity size={14} />;
      case 'html':
      case 'react': return <Code size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div 
          className={styles.sidebar}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <header className={styles.header}>
            <div className={styles.tabsScroll}>
              <div className={styles.tabs}>
                {artifacts.map(a => (
                  <button 
                    key={a.id} 
                    className={`${styles.tab} ${activeId === a.id ? styles.activeTab : ''}`}
                    onClick={() => setActive(a.id)}
                    title={a.title}
                  >
                    {getIcon(a.type)}
                    <span className={styles.tabTitle}>{a.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => toggleSidebar(false)}>
              <X size={18} />
            </button>
          </header>

          <div className={styles.content}>
            {activeArtifact ? (
              <div className={styles.renderArea}>
                {activeArtifact.type === 'html' || activeArtifact.type === 'react' ? (
                  <HtmlArtifact 
                    key={activeArtifact.id + activeArtifact.versions.length}
                    html={activeArtifact.content} 
                    isReact={activeArtifact.type === 'react'} 
                    title={activeArtifact.title}
                  />
                ) : activeArtifact.type === 'mermaid' ? (
                  <MermaidDiagram key={activeArtifact.id} source={activeArtifact.content} />
                ) : activeArtifact.type === 'chart' ? (
                  <InteractiveChart key={activeArtifact.id} raw={activeArtifact.content} />
                ) : (
                  <pre className={styles.codeView}>{activeArtifact.content}</pre>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FileText size={48} strokeWidth={1} />
                <p>Select an artifact to view</p>
              </div>
            )}
          </div>

          {activeArtifact && (
            <footer className={styles.footer}>
              <div className={styles.versionInfo}>
                <span className={styles.versionBadge}>v{activeArtifact.versions.length}</span>
                <span className={styles.timestamp}>
                  {new Date(activeArtifact.versions[activeArtifact.versions.length - 1].timestamp).toLocaleTimeString()}
                </span>
              </div>
              <ArtifactToolbar />
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

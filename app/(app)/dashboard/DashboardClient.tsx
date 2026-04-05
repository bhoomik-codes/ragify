'use client';

import React from 'react';
import Link from 'next/link';
import { EmptyState } from '../../../components/shared/EmptyState';
import { RagCard } from '../../../components/ui/RagCard/RagCard';
import { Button } from '../../../components/ui/Button';
import { Plus } from 'lucide-react';
import type { RagDto } from '../../../lib/types';

export const DashboardClient: React.FC<{ rags: RagDto[] }> = ({ rags }) => {
  if (rags.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '48px auto' }}>
        <EmptyState
          title="Create your first RAG"
          description="Connect your data and configure an LLM to deploy a chat interface in minutes."
          ctaText="+ Create RAG"
          ctaHref="/dashboard/new"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>My RAGs</h1>
        <Link href="/dashboard/new" passHref legacyBehavior>
          <a style={{ textDecoration: 'none' }}>
            <Button variant="primary">
               <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Plus size={16} /> Create RAG
               </span>
            </Button>
          </a>
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {rags.map(rag => (
          <RagCard key={rag.id} rag={rag} />
        ))}
      </div>
    </div>
  );
};

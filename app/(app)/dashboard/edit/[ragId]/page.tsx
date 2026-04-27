import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../../../lib/auth';
import { db } from '../../../../../lib/db';
import { mapRagToDto } from '../../../../../lib/mappers';
import { EditRagClient } from './EditRagClient';

export default async function EditRagPage({ params }: { params: { ragId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const rag = await db.rag.findUnique({
    where: { 
      id: params.ragId,
      userId: session.user.id 
    }
  });

  if (!rag) {
    return notFound();
  }

  const dto = mapRagToDto(rag);

  return (
    <div style={{ maxWidth: '800px', margin: '48px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '1.75rem', color: 'var(--text)' }}>Edit RAG Pipeline</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Update your LLM model, retrieval settings, or upload more documents.</p>
      <EditRagClient rag={dto} />
    </div>
  );
}

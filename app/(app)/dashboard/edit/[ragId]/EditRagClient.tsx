'use client';

import React, { useEffect, useState } from 'react';
import { useWizardStore } from '../../new/wizardStore';
import { WizardForm } from '../../new/WizardForm';
import type { RagDto } from '../../../../../lib/types';

export function EditRagClient({ rag }: { rag: RagDto }) {
  const { updateData, setStep } = useWizardStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    updateData({
      name: rag.name,
      description: rag.description || '',
      emoji: rag.emoji || '🤖',
      tags: rag.tags || [],
      provider: rag.provider,
      model: rag.model,
      temperature: rag.temperature,
      maxTokens: rag.maxTokens,
      topP: rag.topP,
      systemPrompt: rag.systemPrompt || '',
      strictMode: rag.strictMode,
      chunkSize: rag.chunkSize,
      chunkOverlap: rag.chunkOverlap,
      topK: rag.topK,
      threshold: rag.threshold,
      embeddingModel: rag.embeddingModel || 'text-embedding-3-small',
    });
    setStep(1);
    setReady(true);
  }, [rag, updateData, setStep]);

  if (!ready) return null;

  return <WizardForm isEdit={true} ragId={rag.id} />;
}

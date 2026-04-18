import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '../../../../../lib/auth';
import { db } from '../../../../../lib/db';
import { ChatClient } from './ChatClient';

export default async function RagChatPage({ params }: { params: { ragId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }

  const rag = await db.rag.findUnique({
    where: { 
      id: params.ragId,
      userId: session.user.id 
    }
  });

  if (!rag) {
    return notFound();
  }
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ChatClient 
        ragId={rag.id} 
        ragName={rag.name} 
        ragEmoji={rag.emoji || '🤖'} 
        initialProvider={rag.provider}
        initialModel={rag.model}
        initialTemperature={rag.temperature}
        initialMaxTokens={rag.maxTokens}
        initialTopP={rag.topP}
        initialSystemPrompt={rag.systemPrompt}
      />
    </div>
  );
}

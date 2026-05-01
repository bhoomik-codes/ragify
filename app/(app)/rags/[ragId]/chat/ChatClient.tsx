'use client';

import React, { useRef, useEffect, useDeferredValue } from 'react';
import { useChat } from 'ai/react';
import { RichRenderer } from '@/components/chat/RichRenderer';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ArtifactSidebar } from '@/components/artifact/ArtifactSidebar';
import { ChatLayout } from '@/components/layout/ChatLayout';
import Link from 'next/link';
import { ArrowLeft, MessageSquareText, Settings, Menu, Plus, MessageSquare } from 'lucide-react';
import styles from './Chat.module.css';
import { UPLOAD_CONFIG } from '@/lib/uploadConfig';

import { LlmErrorCode } from '@/lib/llm';
import { ERROR_CONFIG } from '@/lib/errorConfig';

function parseErrorCode(error: Error | undefined): LlmErrorCode | 'default' {
  if (!error) return 'default';
  const msg = error.message;
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error && parsed.error in ERROR_CONFIG) return parsed.error as LlmErrorCode;
  } catch {}
  const codes: LlmErrorCode[] = ['INVALID_API_KEY', 'CREDITS_EXHAUSTED', 'MODEL_NOT_FOUND', 'RATE_LIMIT', 'CONTEXT_OVERFLOW', 'PROVIDER_ERROR'];
  for (const code of codes) {
    if (msg.includes(code)) return code;
  }
  return 'default';
}

interface ChatClientProps {
  ragId: string;
  ragName: string;
  ragEmoji: string;
  initialProvider?: string;
  initialModel?: string;
  initialTemperature?: number;
  initialMaxTokens?: number;
  initialTopP?: number;
  initialSystemPrompt?: string | null;
  initialStrictMode?: boolean;
}

import { MODEL_REGISTRY } from '@/lib/models';

export function ChatClient({ 
  ragId, 
  ragName, 
  ragEmoji,
  initialProvider = 'OPENAI',
  initialModel = 'gpt-4o',
  initialTemperature = 0.7,
  initialMaxTokens = 1024,
  initialTopP = 1,
  initialSystemPrompt = '',
  initialStrictMode = false,
}: ChatClientProps) {
  const [selectedModel, setSelectedModel] = React.useState(initialModel);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const [temperature, setTemperature] = React.useState(initialTemperature);
  const [maxTokens, setMaxTokens] = React.useState(initialMaxTokens);
  const [topP, setTopP] = React.useState(initialTopP);
  const [systemPrompt, setSystemPrompt] = React.useState(initialSystemPrompt ?? '');
  const [strictMode, setStrictMode] = React.useState(initialStrictMode ?? false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = React.useState<string>('');

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = React.useState<string | undefined>(undefined);

  const fetchConversations = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/rags/${ragId}/conversations`);
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch (e) {}
  }, [ragId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    setUploadStatus('uploading');
    setUploadMessage(`Uploading ${file.name}…`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/rags/${ragId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus('success');
      setUploadMessage(`✓ "${file.name}" added. Processing in background…`);
      setTimeout(() => { setUploadStatus('idle'); setUploadMessage(''); }, 5000);

    } catch (err: any) {
      setUploadStatus('error');
      setUploadMessage(`⚠ ${err.message}`);
      setTimeout(() => { setUploadStatus('idle'); setUploadMessage(''); }, 5000);
    }
  };

  const handleSaveParams = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/rags/${ragId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature, maxTokens, topP, systemPrompt, strictMode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setPanelOpen(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProvider = React.useMemo(() => {
    for (const [provider, config] of Object.entries(MODEL_REGISTRY)) {
      if (config.models.includes(selectedModel)) {
        return provider;
      }
    }
    return initialProvider;
  }, [selectedModel, initialProvider]);

  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: `/api/rags/${ragId}/chat`,
    body: { model: selectedModel, provider: selectedProvider, conversationId: activeConversationId },
    onResponse: (res) => {
      const headerId = res.headers.get('x-conversation-id');
      if (headerId && headerId !== activeConversationId) {
        setActiveConversationId(headerId);
        fetchConversations(); // refresh list
      }
    }
  });

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/rags/${ragId}/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content
        }));
        setMessages(formatted);
        setActiveConversationId(convId);
      }
      setSidebarOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const createNewChat = () => {
    setMessages([]);
    setActiveConversationId(undefined);
    setSidebarOpen(false);
  };
  
  const endRef = useRef<HTMLDivElement>(null);
  const deferredMessages = useDeferredValue(messages);
  
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [deferredMessages]);

  return (
    <div className={styles.chatContainer} style={{ flexDirection: 'row' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: '260px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <button onClick={createNewChat} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', background: 'var(--text)', color: 'var(--bg)', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer' }}>
              <Plus size={16} /> New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Recent</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {conversations.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => loadConversation(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius)', border: 'none', background: activeConversationId === c.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  <MessageSquare size={14} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || 'New Conversation'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <ChatLayout sidebar={<ArtifactSidebar />}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <header className={styles.chatHeader}>
          <div className={styles.headerContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Menu size={20} />
              </button>
              <Link href="/dashboard" className={styles.backLink}>
                <ArrowLeft size={18} />
              </Link>
            </div>
          <div className={styles.ragIdentity}>
            <span className={styles.ragEmoji}>{ragEmoji}</span>
            <h2 className={styles.ragTitle}>{ragName}</h2>
          </div>
          <div className={styles.modelSwitcher}>
            <select 
              className={styles.modelSelect}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {Object.entries(MODEL_REGISTRY).map(([providerKey, data]) => (
                <optgroup key={providerKey} label={data.label}>
                  {data.models.map(m => (
                    <option key={m} value={m}>{data.label} / {m}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              className={styles.settingsBtn}
              onClick={() => setPanelOpen(true)}
              title="Bot Parameters"
              aria-label="Bot Parameters"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>
      
      <div className={styles.messagesArea}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <MessageSquareText size={48} strokeWidth={1} />
            </div>
            <h3>Welcome to {ragName}</h3>
            <p>I&apos;m ready to help you with your documents. Choose a suggestion or type your own question below.</p>
            
            <div className={styles.suggestionsContainer}>
              {[
                "Summarize my documents",
                "What are the key topics?",
                "Explain the most important concept"
              ].map(suggestion => (
                <button 
                  key={suggestion}
                  className={styles.suggestionChip}
                  onClick={() => handleInputChange({ target: { value: suggestion } } as any)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {deferredMessages.map((m, idx) => (
          <MessageBubble
            key={m.id}
            role={m.role as 'user' | 'assistant'}
            content={m.content}
            isStreaming={isLoading && idx === deferredMessages.length - 1 && m.role === 'assistant'}
            index={idx}
          />
        ))}
        {isLoading && deferredMessages[deferredMessages.length - 1]?.role !== 'assistant' && (
          <TypingIndicator />
        )}
        <div ref={endRef} />
      </div>

      {error && (() => {
        const code = parseErrorCode(error);
        const cfg = ERROR_CONFIG[code];
        return (
          <div className={styles.errorBanner} style={{ '--error-color': cfg.color } as React.CSSProperties}>
            <div className={styles.errorIcon}>{cfg.icon}</div>
            <div className={styles.errorBody}>
              <strong className={styles.errorTitle}>{cfg.title}</strong>
              <p className={styles.errorHint}>{cfg.hint}</p>
            </div>
          </div>
        );
      })()}

      {uploadStatus !== 'idle' && (
        <div className={`${styles.uploadToast} ${styles[`uploadToast_${uploadStatus}`]}`}>
          {uploadMessage}
        </div>
      )}

      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <button
            type="button"
            className={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === 'uploading' || isLoading}
            title="Attach document"
            aria-label="Attach document"
          >
            {uploadStatus === 'uploading' ? (
              <svg className={styles.spinnerIcon} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            )}
          </button>
          <input
            className={styles.inputField}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything..."
            autoComplete="off"
          />
          <button type="submit" className={styles.sendBtn} disabled={isLoading || !input.trim()} aria-label="Send message">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
      </div>
      </ChatLayout>
      
      {/* Settings Overlay */}
      {panelOpen && <div className={styles.panelOverlay} onClick={() => setPanelOpen(false)} />}

      {/* Settings Panel */}
      <div className={`${styles.paramsPanel} ${panelOpen ? styles.paramsPanelOpen : ''}`}>
        <div className={styles.panelHeader}>
          <h3>Bot Parameters</h3>
          <button className={styles.panelCloseBtn} onClick={() => setPanelOpen(false)}>✕</button>
        </div>

        <div className={styles.panelBody}>
          {/* Temperature */}
          <div className={styles.paramGroup}>
            <label>Temperature <span className={styles.paramValue}>{temperature.toFixed(2)}</span></label>
            <input type="range" min={0} max={2} step={0.01}
              value={temperature} onChange={e => setTemperature(Number(e.target.value))} />
          </div>

          {/* Max Tokens */}
          <div className={styles.paramGroup}>
            <label>Max Tokens <span className={styles.paramValue}>{maxTokens}</span></label>
            <input type="range" min={64} max={8192} step={64}
              value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} />
          </div>

          {/* Top P */}
          <div className={styles.paramGroup}>
            <label>Top P <span className={styles.paramValue}>{topP.toFixed(2)}</span></label>
            <input type="range" min={0} max={1} step={0.01}
              value={topP} onChange={e => setTopP(Number(e.target.value))} />
          </div>

          {/* System Prompt */}
          <div className={styles.paramGroup}>
            <label>System Prompt</label>
            <textarea
              className={styles.systemPromptInput}
              rows={5}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
            />
          </div>

          <div className={styles.paramGroup}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                className={styles.checkboxInput}
                checked={strictMode}
                onChange={e => setStrictMode(e.target.checked)}
              />
              Enable Strict Mode
            </label>
          </div>

          {saveError && <p className={styles.saveError}>⚠ {saveError}</p>}

          <div className={styles.panelActions}>
            <button className={styles.cancelBtn} onClick={() => setPanelOpen(false)} disabled={isSaving}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSaveParams} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_CONFIG.getAcceptString()}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </div>
  );
}

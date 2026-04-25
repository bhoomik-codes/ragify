'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { ArrowLeft, MessageSquareText, Settings } from 'lucide-react';
import styles from './Chat.module.css';

type LlmErrorCode = 'INVALID_API_KEY' | 'CREDITS_EXHAUSTED' | 'MODEL_NOT_FOUND' | 'RATE_LIMIT' | 'CONTEXT_OVERFLOW' | 'PROVIDER_ERROR';

const ERROR_CONFIG: Record<LlmErrorCode | 'default', { icon: string; title: string; hint: string; color: string; }> = {
  INVALID_API_KEY:   { icon: '🔑', title: 'Invalid API Key',       hint: 'Your API key is incorrect or revoked. Update it in Settings → Provider Keys.',   color: '#f59e0b' },
  CREDITS_EXHAUSTED: { icon: '💳', title: 'Credits Exhausted',     hint: 'Your API account is out of credits. Top up your balance with your provider.',     color: '#ef4444' },
  MODEL_NOT_FOUND:   { icon: '🤖', title: 'Model Not Available',   hint: "This model doesn't exist or isn't accessible with your key. Pick another above.", color: '#8b5cf6' },
  RATE_LIMIT:        { icon: '⏱️', title: 'Rate Limit Reached',    hint: 'Too many requests. Wait a moment and try again.',                                  color: '#f97316' },
  CONTEXT_OVERFLOW:  { icon: '📄', title: 'Conversation Too Long', hint: "This chat has exceeded the model's context window. Start a new conversation.",     color: '#3b82f6' },
  PROVIDER_ERROR:    { icon: '⚡', title: 'Provider Error',         hint: 'The AI provider returned an unexpected error. Try again in a moment.',             color: '#ef4444' },
  default:           { icon: '⚠️', title: 'Something went wrong',  hint: 'An unexpected error occurred. Please try again.',                                  color: '#ef4444' },
};

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

const MODEL_REGISTRY: Record<string, { label: string; models: string[] }> = {
  OPENAI:    { label: 'OpenAI',        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  ANTHROPIC: { label: 'Anthropic',     models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  GOOGLE:    { label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  MISTRAL:   { label: 'Mistral',       models: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b'] },
  LOCAL:     { label: '🖥️ Local (Ollama)', models: ['llama3.3', 'qwen3:8b', 'qwen3:32b', 'gemma3:4b', 'gemma3:27b', 'deepseek-r1:14b', 'phi4:14b', 'codellama'] },
};

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

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: `/api/rags/${ragId}/chat`,
    body: { model: selectedModel }
  });
  
  const endRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span className={styles.backText}>Dashboard</span>
          </Link>
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
            <p>I'm ready to help you with your documents. Choose a suggestion or type your own question below.</p>
            
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
        
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper}>
            <div className={m.role === 'user' ? styles.userBubble : styles.assistantBubble}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={styles.assistantMessageWrapper}>
            <div className={styles.loadingBubble}>
              <div className={styles.wave}></div>
              <div className={styles.wave}></div>
              <div className={styles.wave}></div>
            </div>
          </div>
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
        accept=".txt,.md,.pdf,.docx"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Key, Check, Plus, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Provider, type UserApiKeyDto } from '@/lib/types';
import styles from './Settings.module.css';

interface ProviderKeyManagerProps {
  initialKeys: UserApiKeyDto[];
}

const PROVIDERS = [
  { id: Provider.OPENAI, name: 'OpenAI', placeholder: 'sk-...' },
  { id: Provider.ANTHROPIC, name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: Provider.GOOGLE, name: 'Google Gemini', placeholder: 'AIza...' },
  { id: Provider.MISTRAL, name: 'Mistral AI', placeholder: '...' },
];

export function ProviderKeyManager({ initialKeys }: ProviderKeyManagerProps) {
  const [keys, setKeys] = useState<UserApiKeyDto[]>(initialKeys);
  const [loading, setLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSave = async (provider: Provider) => {
    setLoading(provider);
    setError(null);
    try {
      const res = await fetch('/api/users/me/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: newKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        const details = data.details?.key?.[0];
        throw new Error(details || data.error || 'Failed to save key');
      }

      const updatedKey = await res.json();
      setKeys(prev => {
        const filtered = prev.filter(k => k.provider !== provider);
        return [...filtered, updatedKey];
      });
      setEditing(null);
      setNewKey('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const keyId = deleteConfirm;
    setLoading(keyId);
    try {
      const res = await fetch(`/api/users/me/provider-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== keyId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Provider Keys (BYOK)</h2>
        <p>Bring your own API keys to use your own model quotas and limits.</p>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>⚠ {error}</div>
      )}

      <div className={styles.providerGrid}>
        {PROVIDERS.map((p) => {
          const config = keys.find(k => k.provider === p.id);
          const isEditing = editing === p.id;

          return (
            <div key={p.id} className={`${styles.providerCard} ${config ? styles.active : ''}`}>
              <div className={styles.providerInfo}>
                <div className={styles.providerIcon}>
                  <ShieldCheck size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.providerName}>{p.name}</div>
                  <span className={`${styles.statusText} ${config ? styles.configured : styles.missing}`}>
                    {config ? 'Configured' : 'Not setup'}
                  </span>
                </div>
                {config && !isEditing && (
                  <button 
                    onClick={() => setDeleteConfirm(config.id)}
                    className={styles.deleteAction}
                    disabled={!!loading}
                    title="Remove key"
                  >
                    <Trash2 size={16} color="var(--text-muted)" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Input 
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={p.placeholder}
                    type="password"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(p.id)}
                      loading={loading === p.id}
                    >
                      Save Key
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => { setEditing(null); setNewKey(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant={config ? 'secondary' : 'primary'} 
                  size="sm"
                  onClick={() => setEditing(p.id)}
                >
                  {config ? 'Update Key' : 'Add Key'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog 
        open={!!deleteConfirm}
        title="Remove API Key"
        description="Are you sure you want to remove this API key? This will stop any RAGs using this provider unless default keys are available."
        confirmText="Remove Key"
        cancelText="Cancel"
        destructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={!!loading && loading === deleteConfirm}
      />
    </div>
  );
}

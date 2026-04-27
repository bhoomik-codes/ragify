'use client';

import React, { useState } from 'react';
import { Key, Plus, Trash2, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { type ApiKeyDto } from '@/lib/types';
import styles from './Settings.module.css';

interface PlatformKeyManagerProps {
  initialKeys: ApiKeyDto[];
}

export function PlatformKeyManager({ initialKeys }: PlatformKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyDto[]>(initialKeys);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<{ fullKey: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading('create');
    try {
      const res = await fetch('/api/users/me/platform-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setKeys(prev => [data, ...prev]);
        setRevealedKey({ fullKey: data.fullKey, name: data.name });
        setShowCreateModal(false);
        setNewKeyName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const keyId = deleteConfirm;
    setLoading(keyId);
    try {
      const res = await fetch(`/api/users/me/platform-keys?id=${keyId}`, {
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

  const copyToClipboard = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey.fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.sectionHeader}>
          <h2>Platform API Keys</h2>
          <p>Generate keys for programmatic access to Ragify services.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: '4px' }} />
          Create New Key
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.keyTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last Used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No API keys yet.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td><code className={styles.prefix}>{k.keyPrefix}...</code></td>
                  <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                  <td className={styles.actions}>
                    <button 
                      onClick={() => setDeleteConfirm(k.id)}
                      disabled={loading === k.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      title="Revoke key"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      <Modal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Platform API Key"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input 
            label="Key Name"
            placeholder="e.g. My Website, Integration Service"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            disabled={loading === 'create'}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} disabled={loading === 'create'}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={loading === 'create'} disabled={!newKeyName.trim()}>
              Generate Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revealed Key Modal */}
      <Modal 
        open={!!revealedKey} 
        onClose={() => setRevealedKey(null)} 
        title="Key Created Successfully"
      >
        <div className={styles.newKeyContainer}>
          <div className={styles.warning}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>This is the only time you will see this key. Copy it now and store it securely.</span>
          </div>
          
          <div className={styles.keyBox}>
            <span style={{ wordBreak: 'break-all' }}>{revealedKey?.fullKey}</span>
            <button 
              onClick={copyToClipboard}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
              title="Copy to clipboard"
            >
              <Copy size={18} />
            </button>
          </div>
          
          {copied && (
            <div className={styles.copySuccess}>
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Copied to clipboard!
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button onClick={() => setRevealedKey(null)}>
              I&apos;ve copied the key
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog 
        open={!!deleteConfirm}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? Any applications currently using it will lose access immediately. This action cannot be undone."
        confirmText="Revoke Key"
        cancelText="Cancel"
        destructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={!!loading && loading === deleteConfirm}
      />
    </div>
  );
}

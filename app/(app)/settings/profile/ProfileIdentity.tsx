'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './ProfilePage.module.css';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

export function ProfileIdentity({ user }: { user: UserData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [error, setError] = useState<string | null>(null);

  // Inline edit states
  const [editUsername, setEditUsername] = useState(false);
  const [usernameVal, setUsernameVal] = useState(user.name || '');
  const [editDisplayName, setEditDisplayName] = useState(false);
  const [displayNameVal, setDisplayNameVal] = useState(user.displayName || '');
  const [bioVal, setBioVal] = useState(user.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Invalid file type (use JPG, PNG, WEBP)');
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/users/me/profile', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAvatar(data.avatarUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Failed to upload avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await fetch('/api/users/me/profile/avatar', { method: 'DELETE' });
      setAvatar(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUsername = async () => {
    if (!/^[a-z0-9-]{3,30}$/i.test(usernameVal)) {
      setError('Username must be 3-30 chars, alphanumeric or hyphens.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameVal })
      });
      if (res.status === 409) {
        setError('Username already taken');
        return;
      }
      if (!res.ok) throw new Error();
      setEditUsername(false);
      router.refresh();
    } catch (err) {
      setError('Failed to save username');
    }
  };

  const handleSaveDisplayName = async () => {
    if (displayNameVal.length > 50) {
      setError('Display name too long');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayNameVal })
      });
      if (!res.ok) throw new Error();
      setEditDisplayName(false);
      router.refresh();
    } catch (err) {
      setError('Failed to save display name');
    }
  };

  // Debounce bio save
  useEffect(() => {
    if (bioVal === (user.bio || '')) return;
    const timer = setTimeout(async () => {
      setSavingBio(true);
      try {
        await fetch('/api/users/me/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bioVal })
        });
        setSavingBio(false);
        setBioSaved(true);
        setTimeout(() => setBioSaved(false), 2000);
      } catch (err) {
        setSavingBio(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [bioVal, user.bio]);

  const initials = (user.name || user.email).substring(0, 2).toUpperCase();
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.card}>
      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {avatar ? (
            <Image src={avatar} alt="Avatar" fill className="object-cover rounded-full" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className={styles.miniBtn} onClick={() => fileInputRef.current?.click()}>
              Upload photo
            </button>
            {avatar && (
              <button className={styles.miniBtn} onClick={handleRemoveAvatar} style={{ color: 'var(--destructive, #ef4444)' }}>
                Remove
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </div>
      </div>

      {error && <div className="text-red-500 text-xs mb-4">{error}</div>}

      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Username</div>
        {editUsername ? (
          <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
            <input className={styles.fieldInput} value={usernameVal} onChange={e => setUsernameVal(e.target.value)} />
            <button className={styles.miniBtn} onClick={handleSaveUsername}>Save</button>
            <button className={styles.miniBtn} onClick={() => { setEditUsername(false); setUsernameVal(user.name || ''); }}>Cancel</button>
          </div>
        ) : (
          <>
            <div className={styles.fieldVal}>{user.name || 'Not set'}</div>
            <button className={styles.miniBtn} onClick={() => setEditUsername(true)}>Change</button>
          </>
        )}
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Display name</div>
        {editDisplayName ? (
          <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
            <input className={styles.fieldInput} value={displayNameVal} onChange={e => setDisplayNameVal(e.target.value)} />
            <button className={styles.miniBtn} onClick={handleSaveDisplayName}>Save</button>
            <button className={styles.miniBtn} onClick={() => { setEditDisplayName(false); setDisplayNameVal(user.displayName || ''); }}>Cancel</button>
          </div>
        ) : (
          <>
            <div className={styles.fieldVal}>{user.displayName || 'Not set'}</div>
            <button className={styles.miniBtn} onClick={() => setEditDisplayName(true)}>Edit</button>
          </>
        )}
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Email</div>
        <div className={styles.fieldVal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user.email}
          <span className={`${styles.badgePill} ${styles.pillGreen}`} style={{ fontSize: '10px' }}>Verified</span>
        </div>
        <button className={styles.miniBtn} onClick={() => alert('Email change modal coming soon')}>Change</button>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Member since</div>
        <div className={styles.fieldVal}>{joinedDate}</div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Plan</div>
        <div className={styles.fieldVal}>
          <span className={`${styles.badgePill} ${styles.pillInfo}`}>Free plan</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className={styles.fieldLabel}>Short bio</div>
          <div className="text-xs text-muted-foreground">
            {savingBio && <span>Saving...</span>}
            {bioSaved && <span className="text-green-500">Saved</span>}
            <span style={{ marginLeft: '8px' }}>{bioVal.length}/160</span>
          </div>
        </div>
        <textarea 
          className={styles.fieldInput} 
          style={{ height: '60px', paddingTop: '8px', resize: 'none', width: '100%' }} 
          maxLength={160} 
          value={bioVal} 
          onChange={e => setBioVal(e.target.value)} 
          placeholder="Tell us a bit about yourself..."
        />
      </div>
    </div>
  );
}

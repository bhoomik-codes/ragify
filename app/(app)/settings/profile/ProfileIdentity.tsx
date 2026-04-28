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
    if (file.size > 2 * 1024 * 1024) { setError('File must be < 2 MB'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Use JPG, PNG, or WEBP'); return; }
    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/users/me/profile', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAvatar(data.avatarUrl);
      router.refresh();
    } catch {
      setError('Failed to upload avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await fetch('/api/users/me/profile/avatar', { method: 'DELETE' });
      setAvatar(null);
      router.refresh();
    } catch { /* silent */ }
  };

  const handleSaveUsername = async () => {
    if (!/^[a-z0-9-]{3,30}$/i.test(usernameVal)) {
      setError('Username: 3–30 chars, letters, numbers, or hyphens.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameVal }),
      });
      if (res.status === 409) { setError('Username already taken'); return; }
      if (!res.ok) throw new Error();
      setEditUsername(false);
      router.refresh();
    } catch { setError('Failed to save username'); }
  };

  const handleSaveDisplayName = async () => {
    if (displayNameVal.length > 50) { setError('Display name too long'); return; }
    setError(null);
    try {
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayNameVal }),
      });
      if (!res.ok) throw new Error();
      setEditDisplayName(false);
      router.refresh();
    } catch { setError('Failed to save display name'); }
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
          body: JSON.stringify({ bio: bioVal }),
        });
        setBioSaved(true);
        setTimeout(() => setBioSaved(false), 2000);
      } finally {
        setSavingBio(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [bioVal, user.bio]);

  const initials = (user.displayName || user.name || user.email).substring(0, 2).toUpperCase();
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.card}>
      {/* Avatar row */}
      <div className={styles.avatarRow}>
        <div className={styles.avatar}>
          {avatar ? (
            <Image src={avatar} alt="Avatar" fill className="object-cover rounded-full" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className={styles.avatarInfo}>
          <div className={styles.avatarName}>{user.displayName || user.name || 'No name set'}</div>
          <div className={styles.avatarEmail}>{user.email}</div>
          <div style={{ marginTop: '4px' }}>
            <span className={`${styles.badge} ${styles.badgePurple}`}>Free plan</span>
          </div>
        </div>
        <div className={styles.avatarActions}>
          <button className={styles.miniBtn} onClick={() => fileInputRef.current?.click()}>
            Upload photo
          </button>
          {avatar && (
            <button className={styles.miniBtn} onClick={handleRemoveAvatar} style={{ color: '#ef4444' }}>
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      {error && <div className={styles.errorMsg}>⚠ {error}</div>}

      {/* Username */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Username</div>
        {editUsername ? (
          <>
            <input
              className={styles.fieldInput}
              value={usernameVal}
              onChange={e => setUsernameVal(e.target.value)}
              autoFocus
            />
            <button className={styles.miniBtn} onClick={handleSaveUsername}>Save</button>
            <button className={styles.miniBtn} onClick={() => { setEditUsername(false); setUsernameVal(user.name || ''); }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className={styles.fieldVal}>{user.name || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}</div>
            <button className={styles.miniBtn} onClick={() => setEditUsername(true)}>Change</button>
          </>
        )}
      </div>

      {/* Display name */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Display name</div>
        {editDisplayName ? (
          <>
            <input
              className={styles.fieldInput}
              value={displayNameVal}
              onChange={e => setDisplayNameVal(e.target.value)}
              autoFocus
            />
            <button className={styles.miniBtn} onClick={handleSaveDisplayName}>Save</button>
            <button className={styles.miniBtn} onClick={() => { setEditDisplayName(false); setDisplayNameVal(user.displayName || ''); }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className={styles.fieldVal}>{user.displayName || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}</div>
            <button className={styles.miniBtn} onClick={() => setEditDisplayName(true)}>Edit</button>
          </>
        )}
      </div>

      {/* Email */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Email</div>
        <div className={styles.fieldVal}>
          {user.email}
          <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ fontSize: '10px' }}>Verified</span>
        </div>
      </div>

      {/* Member since */}
      <div className={styles.fieldRow}>
        <div className={styles.fieldLabel}>Member since</div>
        <div className={styles.fieldVal} style={{ color: 'var(--text-muted)' }}>{joinedDate}</div>
      </div>

      {/* Bio */}
      <div className={styles.bioRow}>
        <div className={styles.bioHeader}>
          <div className={styles.fieldLabel}>Short bio</div>
          <div className={styles.bioMeta}>
            {savingBio && <span className={styles.bioSaving}>Saving… </span>}
            {bioSaved && <span className={styles.bioSaved}>✓ Saved </span>}
            <span>{bioVal.length}/160</span>
          </div>
        </div>
        <textarea
          className={styles.bioInput}
          maxLength={160}
          value={bioVal}
          onChange={e => setBioVal(e.target.value)}
          placeholder="Tell us a bit about yourself..."
        />
      </div>
    </div>
  );
}

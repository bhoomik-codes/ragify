'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Tooltip } from '../../../components/ui/Tooltip';
import styles from './page.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const oauthConfigured = {
    github: true,
    google: false,
  };

  const calculateStrength = (pw: string) => {
    let s = 0;
    if (pw.length > 5) s += 25;
    if (pw.length > 8) s += 25;
    if (/[A-Z]/.test(pw)) s += 25;
    if (/[0-9]/.test(pw)) s += 25;
    return s;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many requests. Please try again later.');
          setLoading(false);
          return;
        }
        
        const data = await res.json().catch(() => ({}));
        
        if (res.status === 400) {
          if (data.details) {
            // Flatten Zod details
            const msgs = Object.values(data.details).flatMap(v => v).join(', ');
            setError(msgs || 'Validation failed');
          } else {
            setError(data.error || 'Registration failed');
          }
        } else {
          setError(data.error || 'Registration failed');
        }
        setLoading(false);
        return;
      }

      // Registration successful, auto sign in
      signIn('credentials', { email, password, redirect: true, callbackUrl: '/dashboard' });
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    signIn(provider, { callbackUrl: '/dashboard' });
  };

  return (
    <Card padding="lg" className={styles.card}>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.subtitle}>Get started with Ragify today</p>
      
      {error && <div style={{ color: '#EF4444', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}

      <form className={styles.form} onSubmit={handleSignup}>
        <Input 
          label="Name" 
          type="text" 
          placeholder="John Doe" 
          required 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input 
          label="Email" 
          type="email" 
          placeholder="you@example.com" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="••••••••" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input 
          label="Confirm Password" 
          type="password" 
          placeholder="••••••••" 
          required 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        
        <div className={styles.passwordStrength}>
          <div 
            className={styles.strengthBar} 
            style={{ width: `${calculateStrength(password)}%` }} 
          />
        </div>
        
        <Button variant="primary" type="submit" className={styles.submitBtn} loading={loading}>Sign Up</Button>
      </form>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <div className={styles.oauth}>
        {oauthConfigured.github ? (
          <Button variant="secondary" className={styles.oauthBtn} onClick={() => handleOAuthLogin('github')} type="button">Continue with GitHub</Button>
        ) : (
          <Tooltip content="GitHub login is not configured">
            <div className={styles.tooltipWrapper}>
              <Button variant="secondary" className={styles.oauthBtn} disabled type="button">Continue with GitHub</Button>
            </div>
          </Tooltip>
        )}
        
        {oauthConfigured.google ? (
          <Button variant="secondary" className={styles.oauthBtn} onClick={() => handleOAuthLogin('google')} type="button">Continue with Google</Button>
        ) : (
          <Tooltip content="Google login is not configured">
            <div className={styles.tooltipWrapper}>
              <Button variant="secondary" className={styles.oauthBtn} disabled type="button">Continue with Google</Button>
            </div>
          </Tooltip>
        )}
      </div>

      <p className={styles.footerText}>
        Already have an account? <Link href="/login" className={styles.link}>Sign in</Link>
      </p>
    </Card>
  );
}

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // In a pure client component, env vars without NEXT_PUBLIC prefix might be undefined, 
  // so we assume they are configured or handled gracefully by NextAuth.
  const oauthConfigured = {
    github: true, 
    google: false, 
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    signIn(provider, { callbackUrl: '/dashboard' });
  };

  return (
    <Card padding="lg" className={styles.card}>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.subtitle}>Enter your details to sign in to your account</p>
      
      {error && <div style={{ color: '#EF4444', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}

      <form className={styles.form} onSubmit={handleCredentialsLogin}>
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
        
        <div className={styles.forgotPassword}>
          <Link href="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>
        
        <Button variant="primary" type="submit" className={styles.submitBtn} loading={loading}>Sign In</Button>
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
        Don&apos;t have an account? <Link href="/signup" className={styles.link}>Sign up</Link>
      </p>
    </Card>
  );
}

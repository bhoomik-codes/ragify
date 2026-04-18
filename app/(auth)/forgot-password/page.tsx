"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setErrorMsg("");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to send reset link");
      }
    } catch (error) {
       setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card padding="lg" className={styles.card}>
      <h1 className={styles.title}>Reset password</h1>
      <p className={styles.subtitle}>Enter your email to receive a password reset link</p>
      
      {!isSuccess ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input 
            label="Email" 
            type="email" 
            placeholder="you@example.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          
          <Button 
            variant="primary" 
            type="submit" 
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
          {errorMsg && <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>{errorMsg}</p>}
        </form>
      ) : (
        <div className={styles.successMessage}>
          <p>If that email address exists in our database, we have sent a password reset link.</p>
          <p>Please check your inbox (and spam folder).</p>
        </div>
      )}

      <p className={styles.footerText}>
        Remember your password? <Link href="/login" className={styles.link}>Sign in</Link>
      </p>
    </Card>
  );
}

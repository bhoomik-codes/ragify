"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!token) {
       setErrorMsg("Invalid or missing password reset token");
       setTimeout(() => router.push("/forgot-password"), 2000);
    }
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    
    setErrorMsg("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, confirmPassword }),
      });

      if (res.ok) {
        setSuccessMsg("Password updated successfully! Redirecting...");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to reset password");
      }
    } catch (error) {
       setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) return null;

  return (
    <Card padding="lg" className={styles.card}>
      <h1 className={styles.title}>Create new password</h1>
      <p className={styles.subtitle}>Enter your new password below</p>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input 
          label="New Password" 
          type="password" 
          placeholder="••••••••" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        <Input 
          label="Confirm Password" 
          type="password" 
          placeholder="••••••••" 
          required 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
        
        <Button 
          variant="primary" 
          type="submit" 
          className={styles.submitBtn}
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Reset Password"}
        </Button>
        {errorMsg && <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>{errorMsg}</p>}
        {successMsg && <p style={{ color: 'green', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>{successMsg}</p>}
      </form>
    </Card>
  );
}

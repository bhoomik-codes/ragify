import React from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  return (
    <Card padding="lg" className={styles.card}>
      <h1 className={styles.title}>Reset password</h1>
      <p className={styles.subtitle}>Enter your email to receive a password reset link</p>
      
      <form className={styles.form}>
        <Input label="Email" type="email" placeholder="you@example.com" required />
        
        <Button variant="primary" type="submit" className={styles.submitBtn}>Send Reset Link</Button>
      </form>

      <p className={styles.footerText}>
        Remember your password? <Link href="/login" className={styles.link}>Sign in</Link>
      </p>
    </Card>
  );
}

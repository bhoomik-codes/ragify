'use client';

import React, { useEffect } from 'react';
import { Button } from '../../../components/ui/Button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid #EF4444', maxWidth: '600px', margin: '48px auto' }}>
      <h2 style={{ color: '#EF4444', marginBottom: '16px' }}>Something went wrong!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>We couldn't load your dashboard data.</p>
      <Button variant="secondary" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}

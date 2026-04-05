import React from 'react';
import { AppShell } from '../../components/layout/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Agent 4 will handle auth injection here
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}

import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { UserDto } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let user: UserDto | undefined;

  if (session?.user?.id) {
    const dbUser = await db.user.findUnique({ where: { id: session.user.id } });
    if (dbUser) {
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.avatarUrl || dbUser.image, // prefer avatarUrl
        onboardingDone: dbUser.onboardingDone,
        theme: dbUser.theme,
        createdAt: dbUser.createdAt.toISOString(),
      };
    }
  }

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}

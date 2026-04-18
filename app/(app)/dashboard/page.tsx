import React from 'react';
import { DashboardClient } from './DashboardClient';
import type { RagDto } from '../../../lib/types';
import { OnboardingTour } from '../../../components/shared/OnboardingTour';
import { auth } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { mapRagToDto } from '../../../lib/mappers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  
  // Explicitly fetch user and RAGs to bypass JWT Token caching
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true }
  });

  const rags = await db.rag.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });
  
  const dtos = rags.map(mapRagToDto);
  const isSetupDone = Boolean(user?.onboardingDone);

  return (
    <>
      <DashboardClient rags={dtos} />
      <OnboardingTour onboardingDone={isSetupDone} />
    </>
  );
}

import React from 'react';
import { DashboardClient } from './DashboardClient';
import type { RagDto } from '../../../lib/types';
import { OnboardingTour } from '../../../components/shared/OnboardingTour';

export default async function DashboardPage() {
  // Simulate network delay for loading state visibility
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockRags: RagDto[] = []; 

  return (
    <>
      <DashboardClient rags={mockRags} />
      <OnboardingTour onboardingDone={false} />
    </>
  );
}
